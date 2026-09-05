import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { StockageLocalPort } from '@/pupitre/shared/stockage-local/domain/StockageLocalPort';
import { HttpBackend, HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, firstValueFrom, map, of } from 'rxjs';
import { DeviceGrantConfiguration } from './DeviceGrantConfiguration';

const OFFLINE_SCOPE = 'openid offline_access';
const DEVICE_CODE_GRANT = 'urn:ietf:params:oauth:grant-type:device_code';
const REFRESH_TOKEN_GRANT = 'refresh_token';
const SLOW_DOWN_EXTRA_SECONDS = 5;
const EXTRA_SECONDS_WHEN_STILL_WAITING = new Map<string, number>([
  ['authorization_pending', 0],
  ['slow_down', SLOW_DOWN_EXTRA_SECONDS],
]);
const REFUSAL_NO_RETRY_WILL_FIX = 'invalid_grant';
const SECONDS_BETWEEN_CLAIMS_UNLESS_TOLD = 5;
const RENEWAL_MARGIN_SECONDS = 30;
const SHORTEST_RENEWAL_DELAY_SECONDS = 5;
const SECONDS_BEFORE_RETRYING_A_RENEWAL = 60;
const SECONDS_A_TOKEN_LASTS_UNLESS_TOLD = 60;
const MILLISECONDS_PER_SECOND = 1000;
const NO_REASON_GIVEN = 'no_reason_given';

interface DeviceAuthorization {
  device_code: string;
  interval?: number;
}

interface Tokens {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
}

interface GrantedTokens {
  tokens: Tokens;
}

interface RefusedGrant {
  refusedBecause: string;
}

type GrantAnswer = GrantedTokens | RefusedGrant;

interface OauthRefusal {
  error?: string;
}

interface Session {
  accessToken: string;
  expiresAt: number;
  refreshToken: string;
  tenant?: string;
}

interface EnrolementPersistant {
  session?: Session;
  tenant?: string;
}

const ENROLEMENT = 'enrolement';

const tenantIn = (token: string): string | undefined => {
  try {
    const claims: unknown = JSON.parse(atob(token.split('.')[1].replaceAll('-', '+').replaceAll('_', '/')));
    if (
      typeof claims === 'object'
      && claims !== null
      && 'tenant' in claims
      && typeof claims.tenant === 'string'
      && claims.tenant.length > 0
    ) {
      return claims.tenant;
    }
  } catch {
    return undefined;
  }
  return undefined;
};

const isGranted = (answer: GrantAnswer): answer is GrantedTokens => 'tokens' in answer;

const isBeyondRenewal = (refusal: RefusedGrant): boolean => refusal.refusedBecause === REFUSAL_NO_RETRY_WILL_FIX;

const reasonIn = (refusal: HttpErrorResponse): string => (refusal.error as OauthRefusal | null)?.error ?? NO_REASON_GIVEN;

const pause = (seconds: number): Promise<void> => new Promise(resolve => setTimeout(resolve, seconds * MILLISECONDS_PER_SECOND));

const isASaneLifetime = (seconds: number | undefined): seconds is number =>
  seconds !== undefined && Number.isFinite(seconds) && seconds > 0;

const lifetimeOf = ({ expires_in }: Tokens): number => (isASaneLifetime(expires_in) ? expires_in : SECONDS_A_TOKEN_LASTS_UNLESS_TOLD);

const secondsBeforeRenewing = (tokens: Tokens): number =>
  Math.max(lifetimeOf(tokens) - RENEWAL_MARGIN_SECONDS, SHORTEST_RENEWAL_DELAY_SECONDS);

const sessionFrom = (tokens: Tokens): Session => ({
  accessToken: tokens.access_token,
  expiresAt: Date.now() + lifetimeOf(tokens) * MILLISECONDS_PER_SECOND,
  refreshToken: tokens.refresh_token,
  tenant: tenantIn(tokens.access_token),
});

const hasExpired = (session: Session): boolean => Date.now() >= session.expiresAt;

@Injectable()
export class DeviceAuthentication extends AuthenticationPort {
  private readonly transport = new HttpClient(inject(HttpBackend));
  private readonly stockage = inject(StockageLocalPort, { optional: true });
  private tenant: string | undefined;
  private restored = false;
  private readonly server = inject(DeviceGrantConfiguration);

  private session: Session | undefined;
  private enrolment: symbol | undefined;
  private renewal: ReturnType<typeof setTimeout> | undefined;

  override async authenticate(): Promise<void> {
    const enrolment = Symbol('enrolment');
    this.enrolment = enrolment;

    try {
      if (await this.restore(enrolment)) {
        return;
      }
    } catch (failure: unknown) {
      console.error('Enrolement non restaure', failure);
      return;
    }

    await this.enrol(enrolment);
  }

  private async enrol(enrolment: symbol): Promise<void> {
    const device = await this.requestDeviceAuthorization();

    if (device === undefined) {
      return;
    }

    const granted = await this.pollUntilGranted(device, enrolment);

    if (granted === undefined || this.isAbandoned(enrolment)) {
      return;
    }

    await this.persistEnrolment(granted, enrolment);
  }

  private async persistEnrolment(granted: Tokens, enrolment: symbol): Promise<void> {
    const session = sessionFrom(granted);
    try {
      await this.save(session);
      if (this.isAbandoned(enrolment)) {
        return;
      }
      this.open(session, secondsBeforeRenewing(granted));
    } catch (failure: unknown) {
      console.error('Enrolement non conserve', failure);
    }
  }

  override currentTenant(): string | undefined {
    return this.tenant;
  }

  override async synchronizeSession(): Promise<void> {
    if (this.stockage === null) {
      return;
    }
    const enrolment = this.enrolment;
    const stored = await this.stockage.read<EnrolementPersistant>(ENROLEMENT);
    if (
      this.enrolment !== enrolment
      || (JSON.stringify(stored?.session) === JSON.stringify(this.session) && stored?.tenant === this.tenant)
    ) {
      return;
    }
    clearTimeout(this.renewal);
    this.session = undefined;
    this.tenant = stored?.tenant;
    if (stored?.session !== undefined) {
      this.open(stored.session, SHORTEST_RENEWAL_DELAY_SECONDS);
    }
  }

  override currentToken(): string | undefined {
    if (this.session === undefined || hasExpired(this.session)) {
      return undefined;
    }
    return this.session.accessToken;
  }

  override logout(): void {
    const ended = this.session;

    this.session = undefined;
    this.enrolment = undefined;
    clearTimeout(this.renewal);
    void this.save(undefined, ended).catch((failure: unknown) => console.error('Deconnexion non conservee', failure));

    if (ended !== undefined) {
      void this.endServerSession(ended.refreshToken);
    }
  }

  private isAbandoned(enrolment: symbol): boolean {
    return this.enrolment !== enrolment;
  }

  private requestDeviceAuthorization(): Promise<DeviceAuthorization | undefined> {
    return firstValueFrom(
      this.transport
        .post<DeviceAuthorization>(this.server.deviceAuthorizationEndpoint(), this.namingThisClient().set('scope', OFFLINE_SCOPE))
        .pipe(catchError(() => of(undefined))),
    );
  }

  private async pollUntilGranted(device: DeviceAuthorization, enrolment: symbol): Promise<Tokens | undefined> {
    let secondsBetweenClaims = device.interval ?? SECONDS_BETWEEN_CLAIMS_UNLESS_TOLD;

    for (;;) {
      await pause(secondsBetweenClaims);

      if (this.isAbandoned(enrolment)) {
        return undefined;
      }

      const answer = await this.claimTokens(device.device_code);

      if (isGranted(answer)) {
        return answer.tokens;
      }

      const extraSeconds = EXTRA_SECONDS_WHEN_STILL_WAITING.get(answer.refusedBecause);

      if (extraSeconds === undefined) {
        return undefined;
      }

      secondsBetweenClaims += extraSeconds;
    }
  }

  private claimTokens(deviceCode: string): Promise<GrantAnswer> {
    return this.askForTokens(this.namingThisClient().set('grant_type', DEVICE_CODE_GRANT).set('device_code', deviceCode));
  }

  private renewTokens(refreshToken: string): Promise<GrantAnswer> {
    return this.askForTokens(this.namingThisClient().set('grant_type', REFRESH_TOKEN_GRANT).set('refresh_token', refreshToken));
  }

  private askForTokens(grant: HttpParams): Promise<GrantAnswer> {
    return firstValueFrom(
      this.transport.post<Tokens>(this.server.tokenEndpoint(), grant).pipe(
        map((tokens): GrantAnswer => ({ tokens })),
        catchError((refusal: HttpErrorResponse) => of<GrantAnswer>({ refusedBecause: reasonIn(refusal) })),
      ),
    );
  }

  private namingThisClient(): HttpParams {
    return new HttpParams().set('client_id', this.server.clientId);
  }

  private open(session: Session, secondsBeforeTheRenewal: number): void {
    clearTimeout(this.renewal);

    this.session = session;
    this.tenant = session.tenant;
    this.renewal = setTimeout(() => void this.renewFrom(session), secondsBeforeTheRenewal * MILLISECONDS_PER_SECOND);
  }

  private async renewFrom(session: Session): Promise<void> {
    try {
      if (this.stockage !== null) {
        await this.stockage.lock('enrolement', () => this.renewStoredSession(session));
        return;
      }
      await this.renewSession(session);
    } catch (failure: unknown) {
      console.error('Renouvellement non conserve', failure);
      if (this.session === session) {
        this.open(session, SECONDS_BEFORE_RETRYING_A_RENEWAL);
      }
    }
  }

  private async renewStoredSession(session: Session): Promise<void> {
    const stored = await this.stockage?.read<EnrolementPersistant>(ENROLEMENT);
    if (this.session !== session) {
      return;
    }
    if (stored?.session === undefined) {
      this.session = undefined;
      this.tenant = stored?.tenant;
      return;
    }
    if (stored.session.refreshToken !== session.refreshToken) {
      this.open(stored.session, SHORTEST_RENEWAL_DELAY_SECONDS);
      return;
    }
    await this.renewSession(session);
  }

  private async renewSession(session: Session): Promise<void> {
    const answer = await this.renewTokens(session.refreshToken);

    if (this.session !== session) {
      return;
    }

    if (isGranted(answer)) {
      await this.persistRenewal(answer.tokens, session);
      return;
    }

    if (isBeyondRenewal(answer)) {
      await this.reenrol(session);
      return;
    }

    this.open(session, SECONDS_BEFORE_RETRYING_A_RENEWAL);
  }

  private async persistRenewal(tokens: Tokens, session: Session): Promise<void> {
    const renewed = sessionFrom(tokens);
    const persistence = await this.save(renewed, session);
    if (persistence === 'REMPLACE') {
      await this.synchronizeSession();
      return;
    }
    if (this.session === session) {
      this.open(renewed, secondsBeforeRenewing(tokens));
      return;
    }
    await this.save(undefined, renewed);
  }

  private async reenrol(session: Session): Promise<void> {
    const persistence = await this.save(undefined, session);
    if (persistence === 'REMPLACE') {
      await this.synchronizeSession();
      return;
    }
    this.session = undefined;
    await this.authenticate();
  }

  private async restore(enrolment: symbol): Promise<boolean> {
    if (this.restored || this.stockage === null) {
      return false;
    }
    const stored = await this.stockage.read<EnrolementPersistant>(ENROLEMENT);
    if (this.isAbandoned(enrolment)) {
      return true;
    }
    this.restored = true;
    this.tenant = stored?.tenant;
    if (stored?.session === undefined) {
      return false;
    }
    this.open(stored.session, SHORTEST_RENEWAL_DELAY_SECONDS);
    return true;
  }

  private async save(session: Session | undefined, expected?: Session): Promise<'CONSERVE' | 'REMPLACE'> {
    if (this.stockage === null) {
      return 'CONSERVE';
    }
    return this.stockage.lock('session', async () => {
      let resultat: 'CONSERVE' | 'REMPLACE' = 'REMPLACE';
      await this.stockage?.update<EnrolementPersistant>(ENROLEMENT, {}, current => {
        if (expected !== undefined && JSON.stringify(current.session) !== JSON.stringify(expected)) {
          return current;
        }
        resultat = 'CONSERVE';
        return { session, tenant: session?.tenant ?? this.tenant };
      });
      return resultat;
    });
  }

  private endServerSession(refreshToken: string): Promise<unknown> {
    const ending = this.namingThisClient().set('refresh_token', refreshToken);

    return firstValueFrom(this.transport.post(this.server.logoutEndpoint(), ending).pipe(catchError(() => of(undefined))));
  }
}
