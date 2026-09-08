import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import {
  DeviceEnrolmentOutcome,
  DeviceEnrolmentPort,
  ShowDeviceAuthorizationCode,
} from '@/pupitre/shared/authentication/domain/DeviceEnrolmentPort';
import { LocalStoragePort } from '@/pupitre/shared/local-storage/domain/LocalStoragePort';
import { inject, Injectable } from '@angular/core';
import {
  authorizationCodeFrom,
  DeviceAuthorization,
  DeviceGrantClient,
  GrantAnswer,
  isGranted,
  RefusedGrant,
  Tokens,
} from './DeviceGrantClient';
import { SessionDAppareil, SessionStockee } from './SessionDAppareil';

const SLOW_DOWN_EXTRA_SECONDS = 5;
const EXTRA_SECONDS_WHEN_STILL_WAITING = new Map<string, number>([
  ['authorization_pending', 0],
  ['slow_down', SLOW_DOWN_EXTRA_SECONDS],
]);
const OUTCOME_WHEN_REFUSED = new Map<string, DeviceEnrolmentOutcome>([
  ['access_denied', 'DENIED'],
  ['expired_token', 'EXPIRED'],
]);
const REFUSAL_NO_RETRY_WILL_FIX = 'invalid_grant';
const SECONDS_BETWEEN_CLAIMS_UNLESS_TOLD = 5;
const SECONDS_BEFORE_RETRYING_A_RENEWAL = 60;
const MILLISECONDS_PER_SECOND = 1000;

interface PersistedEnrolment {
  session?: SessionStockee;
  tenant?: string;
}

const ENROLEMENT = 'enrolement';

const isBeyondRenewal = (refusal: RefusedGrant): boolean => refusal.refusedBecause === REFUSAL_NO_RETRY_WILL_FIX;

const pause = (seconds: number): Promise<void> => new Promise(resolve => setTimeout(resolve, seconds * MILLISECONDS_PER_SECOND));

const persistedEnrolmentFrom = (session: SessionDAppareil | undefined, tenant: string | undefined): PersistedEnrolment => {
  const enrolment: PersistedEnrolment = {};
  if (session !== undefined) {
    enrolment.session = session.document();
  }
  if (tenant !== undefined) {
    enrolment.tenant = tenant;
  }
  return enrolment;
};

const canRestoreSession = (restored: boolean, stockage: LocalStoragePort | null): stockage is LocalStoragePort =>
  !(restored || stockage === null);

const hasConcurrentSession = (expected: SessionDAppareil | undefined, current: PersistedEnrolment): boolean =>
  expected !== undefined && !SessionDAppareil.same(SessionDAppareil.restored(current.session), expected);

const SHOW_NO_CODE: ShowDeviceAuthorizationCode = () => undefined;

type Restoration = 'RESTORED' | 'ABANDONED' | 'ABSENT' | 'UNREACHABLE';

@Injectable()
export class DeviceAuthentication extends AuthenticationPort implements DeviceEnrolmentPort {
  private readonly grant = inject(DeviceGrantClient);
  private readonly stockage = inject(LocalStoragePort, { optional: true });
  private readonly errorHandler = inject(ErrorHandlerPort);
  private tenant: string | undefined;
  private restored = false;

  private session: SessionDAppareil | undefined;
  private enrolment: symbol | undefined;
  private renewal: ReturnType<typeof setTimeout> | undefined;

  override async authenticate(): Promise<void> {
    await this.enrol(SHOW_NO_CODE);
  }

  async enrol(showCode: ShowDeviceAuthorizationCode): Promise<DeviceEnrolmentOutcome> {
    const enrolment = Symbol('enrolment');
    this.enrolment = enrolment;

    const restoration = await this.restoreOrReport(enrolment);

    if (restoration === 'RESTORED') {
      return 'ENROLLED';
    }
    if (restoration !== 'ABSENT') {
      return restoration;
    }

    return this.requestApproval(enrolment, showCode);
  }

  private async restoreOrReport(enrolment: symbol): Promise<Restoration> {
    try {
      return await this.restore(enrolment);
    } catch (failure: unknown) {
      this.errorHandler.handleError(failure);
      return 'UNREACHABLE';
    }
  }

  private async requestApproval(enrolment: symbol, showCode: ShowDeviceAuthorizationCode): Promise<DeviceEnrolmentOutcome> {
    const device = await this.grant.requestDeviceAuthorization();

    if (device === undefined) {
      return 'UNREACHABLE';
    }

    showCode(authorizationCodeFrom(device));

    const answer = await this.pollUntilGranted(device, enrolment);

    if (!this.isActiveGrant(answer, enrolment)) {
      return 'ABANDONED';
    }
    if (!isGranted(answer)) {
      return OUTCOME_WHEN_REFUSED.get(answer.refusedBecause) ?? 'UNREACHABLE';
    }

    return this.persistEnrolment(answer.tokens, enrolment);
  }

  private async persistEnrolment(granted: Tokens, enrolment: symbol): Promise<DeviceEnrolmentOutcome> {
    const session = SessionDAppareil.granted(granted, Date.now());
    try {
      await this.save(session);
      if (this.isAbandoned(enrolment)) {
        return 'ABANDONED';
      }
      this.open(session);
      return 'ENROLLED';
    } catch (failure: unknown) {
      this.errorHandler.handleError(failure);
      return 'UNREACHABLE';
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
    const stored = await this.stockage.read<PersistedEnrolment>(ENROLEMENT);
    if (this.isSynchronizationUnnecessary(enrolment, stored)) {
      return;
    }
    clearTimeout(this.renewal);
    this.session = undefined;
    this.tenant = stored?.tenant;
    this.openIfPresent(SessionDAppareil.restored(stored?.session));
  }

  override currentToken(): string | undefined {
    return this.session?.accessTokenAt(Date.now());
  }

  private isSynchronizationUnnecessary(enrolment: symbol | undefined, stored: PersistedEnrolment | undefined): boolean {
    return this.enrolment !== enrolment || this.matchesStoredEnrolment(stored);
  }

  private matchesStoredEnrolment(stored: PersistedEnrolment | undefined): boolean {
    return SessionDAppareil.same(SessionDAppareil.restored(stored?.session), this.session) && stored?.tenant === this.tenant;
  }

  override logout(): void {
    const ended = this.session;

    this.session = undefined;
    this.enrolment = undefined;
    clearTimeout(this.renewal);
    void this.save(undefined, ended).catch((failure: unknown) => {
      this.errorHandler.handleError(failure);
    });

    if (ended !== undefined) {
      void this.grant.endSession(ended.refreshToken());
    }
  }

  private isAbandoned(enrolment: symbol): boolean {
    return this.enrolment !== enrolment;
  }

  private isActiveGrant(answer: GrantAnswer | undefined, enrolment: symbol): answer is GrantAnswer {
    return !(answer === undefined || this.isAbandoned(enrolment));
  }

  private async pollUntilGranted(device: DeviceAuthorization, enrolment: symbol): Promise<GrantAnswer | undefined> {
    let secondsBetweenClaims = device.interval ?? SECONDS_BETWEEN_CLAIMS_UNLESS_TOLD;

    for (;;) {
      await pause(secondsBetweenClaims);

      if (this.isAbandoned(enrolment)) {
        return undefined;
      }

      const answer = await this.grant.claimTokens(device.device_code);

      if (isGranted(answer)) {
        return answer;
      }

      const extraSeconds = EXTRA_SECONDS_WHEN_STILL_WAITING.get(answer.refusedBecause);

      if (extraSeconds === undefined) {
        return answer;
      }

      secondsBetweenClaims += extraSeconds;
    }
  }

  private openIfPresent(session: SessionDAppareil | undefined): void {
    if (session !== undefined) {
      this.open(session);
    }
  }

  private open(session: SessionDAppareil, secondsBeforeTheRenewal = session.secondsBeforeRenewing()): void {
    clearTimeout(this.renewal);

    this.session = session;
    this.tenant = session.tenant();
    this.renewal = setTimeout(() => void this.renewFrom(session), secondsBeforeTheRenewal * MILLISECONDS_PER_SECOND);
  }

  private async renewFrom(session: SessionDAppareil): Promise<void> {
    try {
      if (this.stockage !== null) {
        await this.stockage.lock('enrolement', () => this.renewStoredSession(session));
        return;
      }
      await this.renewSession(session);
    } catch (failure: unknown) {
      this.errorHandler.handleError(failure);
      if (this.session === session) {
        this.open(session, SECONDS_BEFORE_RETRYING_A_RENEWAL);
      }
    }
  }

  private async renewStoredSession(session: SessionDAppareil): Promise<void> {
    const stored = await this.stockage?.read<PersistedEnrolment>(ENROLEMENT);
    if (this.session !== session) {
      return;
    }
    const persisted = SessionDAppareil.restored(stored?.session);
    if (persisted === undefined) {
      this.session = undefined;
      this.tenant = stored?.tenant;
      return;
    }
    if (!persisted.hasSameRefreshTokenAs(session)) {
      this.open(persisted);
      return;
    }
    await this.renewSession(session);
  }

  private async renewSession(session: SessionDAppareil): Promise<void> {
    const answer = await this.grant.renewTokens(session.refreshToken());

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

  private async persistRenewal(tokens: Tokens, session: SessionDAppareil): Promise<void> {
    const renewed = SessionDAppareil.granted(tokens, Date.now());
    const persistence = await this.save(renewed, session);
    if (persistence === 'REMPLACE') {
      await this.synchronizeSession();
      return;
    }
    if (this.session === session) {
      this.open(renewed);
      return;
    }
    await this.save(undefined, renewed);
  }

  private async reenrol(session: SessionDAppareil): Promise<void> {
    const persistence = await this.save(undefined, session);
    if (persistence === 'REMPLACE') {
      await this.synchronizeSession();
      return;
    }
    this.session = undefined;
    await this.authenticate();
  }

  private async restore(enrolment: symbol): Promise<Restoration> {
    if (!canRestoreSession(this.restored, this.stockage)) {
      return 'ABSENT';
    }
    const stored = await this.stockage.read<PersistedEnrolment>(ENROLEMENT);
    if (this.isAbandoned(enrolment)) {
      return 'ABANDONED';
    }
    this.restored = true;
    this.tenant = stored?.tenant;
    const persisted = SessionDAppareil.restored(stored?.session);
    if (persisted === undefined) {
      return 'ABSENT';
    }
    this.open(persisted);
    return 'RESTORED';
  }

  private async save(session: SessionDAppareil | undefined, expected?: SessionDAppareil): Promise<'CONSERVE' | 'REMPLACE'> {
    if (this.stockage === null) {
      return 'CONSERVE';
    }
    return this.stockage.lock('session', async () => {
      let resultat: 'CONSERVE' | 'REMPLACE' = 'REMPLACE';
      await this.stockage?.update<PersistedEnrolment>(ENROLEMENT, {}, current => {
        if (hasConcurrentSession(expected, current)) {
          return current;
        }
        resultat = 'CONSERVE';
        return persistedEnrolmentFrom(session, session?.tenant() ?? this.tenant);
      });
      return resultat;
    });
  }
}
