import { AuthenticationPort } from '@/app/authentication/domain/AuthenticationPort';
import { HttpBackend, HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, firstValueFrom, map, of } from 'rxjs';
import { DeviceGrantConfiguration } from './DeviceGrantConfiguration';

const OFFLINE_SCOPE = 'openid offline_access';
const DEVICE_CODE_GRANT = 'urn:ietf:params:oauth:grant-type:device_code';
const REFRESH_TOKEN_GRANT = 'refresh_token';
const SLOW_DOWN_EXTRA_SECONDS = 5;
const EXTRA_SECONDS_WHEN_STILL_WAITING: Record<string, number | undefined> = {
  authorization_pending: 0,
  slow_down: SLOW_DOWN_EXTRA_SECONDS,
};
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
}

const isGranted = (answer: GrantAnswer): answer is GrantedTokens => 'tokens' in answer;

const reasonIn = (refusal: HttpErrorResponse): string => (refusal.error as OauthRefusal | null)?.error ?? NO_REASON_GIVEN;

const pause = (seconds: number): Promise<void> => new Promise(resolve => setTimeout(resolve, seconds * MILLISECONDS_PER_SECOND));

const isASaneLifetime = (seconds: number | undefined): seconds is number => seconds !== undefined && Number.isFinite(seconds);

const lifetimeOf = ({ expires_in }: Tokens): number => (isASaneLifetime(expires_in) ? expires_in : SECONDS_A_TOKEN_LASTS_UNLESS_TOLD);

const secondsBeforeRenewing = (tokens: Tokens): number =>
  Math.max(lifetimeOf(tokens) - RENEWAL_MARGIN_SECONDS, SHORTEST_RENEWAL_DELAY_SECONDS);

const sessionFrom = (tokens: Tokens): Session => ({
  accessToken: tokens.access_token,
  expiresAt: Date.now() + lifetimeOf(tokens) * MILLISECONDS_PER_SECOND,
  refreshToken: tokens.refresh_token,
});

const hasExpired = (session: Session): boolean => Date.now() >= session.expiresAt;

@Injectable()
export class DeviceAuthentication extends AuthenticationPort {
  private readonly transport = new HttpClient(inject(HttpBackend));
  private readonly server = inject(DeviceGrantConfiguration);

  private session: Session | undefined;
  private enrolment: symbol | undefined;
  private renewal: ReturnType<typeof setTimeout> | undefined;

  override async authenticate(): Promise<void> {
    const enrolment = Symbol('enrolment');
    this.enrolment = enrolment;

    const device = await this.requestDeviceAuthorization();

    if (device === undefined) {
      return;
    }

    const granted = await this.pollUntilGranted(device, enrolment);

    if (granted === undefined || this.isAbandoned(enrolment)) {
      return;
    }

    this.open(sessionFrom(granted), secondsBeforeRenewing(granted));
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

      const extraSeconds = EXTRA_SECONDS_WHEN_STILL_WAITING[answer.refusedBecause];

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
    this.renewal = setTimeout(() => void this.renewFrom(session), secondsBeforeTheRenewal * MILLISECONDS_PER_SECOND);
  }

  private async renewFrom(session: Session): Promise<void> {
    const answer = await this.renewTokens(session.refreshToken);

    if (this.session !== session) {
      return;
    }

    if (isGranted(answer)) {
      this.open(sessionFrom(answer.tokens), secondsBeforeRenewing(answer.tokens));
      return;
    }

    this.open(session, SECONDS_BEFORE_RETRYING_A_RENEWAL);
  }

  private endServerSession(refreshToken: string): Promise<unknown> {
    const ending = this.namingThisClient().set('refresh_token', refreshToken);

    return firstValueFrom(this.transport.post(this.server.logoutEndpoint(), ending).pipe(catchError(() => of(undefined))));
  }
}
