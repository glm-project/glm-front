import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { DeviceAuthorizationPort, EnrolmentRequirement } from '@/pupitre/shared/authentication/domain/DeviceAuthorizationPort';
import {
  DeviceEnrolmentOutcome,
  DeviceEnrolmentPort,
  ShowDeviceAuthorizationCode,
} from '@/pupitre/shared/authentication/domain/DeviceEnrolmentPort';
import { DeviceSessionPort } from '@/pupitre/shared/authentication/domain/DeviceSessionPort';
import { LocalStoragePort } from '@/pupitre/shared/local-storage/domain/LocalStoragePort';
import { inject, Injectable } from '@angular/core';
import { DeviceCredentialsStorage, StoredDeviceCredentials } from './DeviceCredentialsStorage';
import {
  authorizationCodeFrom,
  DeviceAuthorization,
  DeviceGrantClient,
  GrantAnswer,
  isGranted,
  RefusedGrant,
  Tokens,
} from './DeviceGrantClient';
import { EnrolmentRequirements } from './EnrolmentRequirements';
import { SessionDAppareil } from './SessionDAppareil';

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

const isBeyondRenewal = (refusal: RefusedGrant): boolean => refusal.refusedBecause === REFUSAL_NO_RETRY_WILL_FIX;

const pause = (seconds: number): Promise<void> => new Promise(resolve => setTimeout(resolve, seconds * MILLISECONDS_PER_SECOND));

const credentialsFor = (stockage: LocalStoragePort | null): DeviceCredentialsStorage | undefined =>
  stockage === null ? undefined : new DeviceCredentialsStorage(stockage);

const canRestoreSession = (restored: boolean, credentials: DeviceCredentialsStorage | undefined): credentials is DeviceCredentialsStorage =>
  !(restored || credentials === undefined);

const SHOW_NO_CODE: ShowDeviceAuthorizationCode = () => undefined;

type Restoration = 'RESTORED' | 'ABANDONED' | 'ABSENT' | 'UNREACHABLE';

@Injectable()
export class DeviceAuthentication extends AuthenticationPort implements DeviceEnrolmentPort, DeviceSessionPort, DeviceAuthorizationPort {
  private readonly grant = inject(DeviceGrantClient);
  private readonly credentials = credentialsFor(inject(LocalStoragePort, { optional: true }));
  private readonly errorHandler = inject(ErrorHandlerPort);
  private readonly enrolmentRequirements = new EnrolmentRequirements();
  private tenant: string | undefined;
  private readonly readSelectedTenant = (): string | undefined => this.tenant;
  private restored = false;

  private session: SessionDAppareil | undefined;
  private pendingEnrolmentSession: SessionDAppareil | undefined;
  private enrolment: symbol | undefined;
  private renewal: ReturnType<typeof setTimeout> | undefined;

  override async authenticate(): Promise<void> {
    await this.enrol(SHOW_NO_CODE);
  }

  async enrol(showCode: ShowDeviceAuthorizationCode): Promise<DeviceEnrolmentOutcome> {
    this.enrolmentRequirements.reset();
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
      await this.invalidatePendingEnrolment();
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
    this.pendingEnrolmentSession = session;
    try {
      await this.credentials?.storeEnrolment(session, () => this.isAbandoned(enrolment), this.readSelectedTenant);
      if (this.isAbandoned(enrolment)) {
        await this.credentials?.retire(session, this.readSelectedTenant);
        return 'ABANDONED';
      }
      this.open(session);
      return 'ENROLLED';
    } catch (failure: unknown) {
      this.errorHandler.handleError(failure);
      return 'UNREACHABLE';
    } finally {
      if (this.pendingEnrolmentSession === session) {
        this.pendingEnrolmentSession = undefined;
      }
    }
  }

  private async invalidatePendingEnrolment(): Promise<void> {
    const expected = this.pendingEnrolmentSession;
    if (expected === undefined) {
      return;
    }
    await this.credentials?.discardPending(expected, this.readSelectedTenant);
  }

  override currentTenant(): string | undefined {
    return this.tenant;
  }

  override async synchronizeSession(): Promise<void> {
    if (this.credentials === undefined) {
      return;
    }
    const enrolment = this.enrolment;
    const stored = await this.credentials.read();
    if (this.isSynchronizationUnnecessary(enrolment, stored)) {
      return;
    }
    const authorizationWasLost = this.hasLostStoredSession(stored);
    clearTimeout(this.renewal);
    this.session = undefined;
    this.tenant = stored.tenant;
    this.openIfPresent(stored.session);
    if (authorizationWasLost) {
      this.enrolmentRequirements.request();
    }
  }

  override currentToken(): string | undefined {
    return this.session?.accessTokenAt(Date.now());
  }

  withSession<T>(action: () => Promise<T>): Promise<T> {
    if (this.credentials === undefined) {
      return action();
    }
    return this.credentials.withSession(action);
  }

  private isSynchronizationUnnecessary(enrolment: symbol | undefined, stored: StoredDeviceCredentials): boolean {
    return this.enrolment !== enrolment || this.matchesStoredEnrolment(stored);
  }

  private matchesStoredEnrolment(stored: StoredDeviceCredentials): boolean {
    return SessionDAppareil.same(stored.session, this.session) && stored.tenant === this.tenant;
  }

  private hasLostStoredSession(stored: StoredDeviceCredentials): boolean {
    return this.session !== undefined && stored.session === undefined;
  }

  override logout(): void {
    const ended = this.session;

    this.session = undefined;
    this.enrolment = undefined;
    clearTimeout(this.renewal);
    const removal = this.removeLoggedOutCredentials(ended);
    void removal.catch((failure: unknown) => {
      this.errorHandler.handleError(failure);
    });

    if (ended !== undefined) {
      void this.grant.endSession(ended.refreshToken());
    }
  }

  private async removeLoggedOutCredentials(ended: SessionDAppareil | undefined): Promise<void> {
    if (ended === undefined) {
      await this.credentials?.clear(this.readSelectedTenant);
      return;
    }
    await this.credentials?.retire(ended, this.readSelectedTenant);
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
      const credentials = this.credentials;
      if (credentials !== undefined) {
        await credentials.withRenewal(() => this.renewStoredSession(session, credentials));
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

  private async renewStoredSession(session: SessionDAppareil, credentials: DeviceCredentialsStorage): Promise<void> {
    const stored = await credentials.read();
    if (this.session !== session) {
      return;
    }
    const persisted = stored.session;
    if (persisted === undefined) {
      this.tenant = stored.tenant;
      this.requireEnrolment();
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
      await this.retireAuthorization(session);
      return;
    }

    this.open(session, SECONDS_BEFORE_RETRYING_A_RENEWAL);
  }

  private async persistRenewal(tokens: Tokens, session: SessionDAppareil): Promise<void> {
    const renewed = SessionDAppareil.granted(tokens, Date.now());
    const persistence = await this.credentials?.storeRenewal(renewed, session, this.readSelectedTenant);
    if (persistence === 'REMPLACE') {
      await this.synchronizeSession();
      return;
    }
    if (this.session === session) {
      this.open(renewed);
      return;
    }
    await this.credentials?.retire(renewed, this.readSelectedTenant);
  }

  private async retireAuthorization(session: SessionDAppareil): Promise<void> {
    const persistence = await this.credentials?.retire(session, this.readSelectedTenant);
    if (persistence === 'REMPLACE') {
      await this.synchronizeSession();
      return;
    }
    if (this.session !== session) {
      return;
    }
    this.requireEnrolment();
  }

  private requireEnrolment(): void {
    clearTimeout(this.renewal);
    this.session = undefined;
    this.enrolmentRequirements.request();
  }

  async invalidateAuthorization(token: string): Promise<void> {
    const session = this.session;
    if (session?.accessTokenAt(Date.now()) !== token) {
      return;
    }
    await this.retireAuthorization(session);
  }

  waitForRequiredEnrolment(): EnrolmentRequirement {
    return this.enrolmentRequirements.wait();
  }

  private async restore(enrolment: symbol): Promise<Restoration> {
    if (!canRestoreSession(this.restored, this.credentials)) {
      return 'ABSENT';
    }
    const stored = await this.credentials.read();
    if (this.isAbandoned(enrolment)) {
      return 'ABANDONED';
    }
    this.restored = true;
    this.tenant = stored.tenant;
    const persisted = stored.session;
    if (persisted === undefined) {
      return 'ABSENT';
    }
    this.open(persisted);
    return 'RESTORED';
  }
}
