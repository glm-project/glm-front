import { LocalStoragePort } from '@/pupitre/shared/local-storage/domain/LocalStoragePort';
import { SessionDAppareil, StoredSession } from './SessionDAppareil';

interface PersistedEnrolment {
  session?: StoredSession;
  tenant?: string;
}

export interface StoredDeviceCredentials {
  readonly session: SessionDAppareil | undefined;
  readonly tenant: string | undefined;
}

const ENROLEMENT = 'enrolement';

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

export class DeviceCredentialsStorage {
  constructor(private readonly stockage: LocalStoragePort) {}

  async read(): Promise<StoredDeviceCredentials> {
    const stored = await this.stockage.read<PersistedEnrolment>(ENROLEMENT);
    return { session: SessionDAppareil.restored(stored?.session), tenant: stored?.tenant };
  }

  withSession<T>(action: () => Promise<T>): Promise<T> {
    return this.stockage.lock('enrolement', () => this.stockage.lock('session', action));
  }

  withRenewal(action: () => Promise<void>): Promise<void> {
    return this.stockage.lock('enrolement', action);
  }

  async discardPending(expected: SessionDAppareil, tenant: () => string | undefined): Promise<void> {
    await this.stockage.update<PersistedEnrolment>(ENROLEMENT, {}, current => {
      if (!SessionDAppareil.same(SessionDAppareil.restored(current.session), expected)) {
        return current;
      }
      return persistedEnrolmentFrom(undefined, tenant());
    });
  }

  storeEnrolment(session: SessionDAppareil, isAbandoned: () => boolean, tenant: () => string | undefined): Promise<void> {
    return this.update(current => {
      if (isAbandoned()) {
        return current;
      }
      return persistedEnrolmentFrom(session, session.tenant() ?? tenant());
    });
  }

  async storeRenewal(
    session: SessionDAppareil,
    expected: SessionDAppareil,
    tenant: () => string | undefined,
  ): Promise<'CONSERVE' | 'REMPLACE'> {
    let result: 'CONSERVE' | 'REMPLACE' = 'CONSERVE';
    await this.update(current => {
      if (!SessionDAppareil.same(SessionDAppareil.restored(current.session), expected)) {
        result = 'REMPLACE';
        return current;
      }
      return persistedEnrolmentFrom(session, session.tenant() ?? tenant());
    });
    return result;
  }

  async retire(expected: SessionDAppareil, tenant: () => string | undefined): Promise<'CONSERVE' | 'REMPLACE'> {
    let result: 'CONSERVE' | 'REMPLACE' = 'CONSERVE';
    await this.update(current => {
      if (!SessionDAppareil.same(SessionDAppareil.restored(current.session), expected)) {
        result = 'REMPLACE';
        return current;
      }
      return persistedEnrolmentFrom(undefined, tenant());
    });
    return result;
  }

  clear(tenant: () => string | undefined): Promise<void> {
    return this.update(() => persistedEnrolmentFrom(undefined, tenant()));
  }

  private update(change: (current: PersistedEnrolment) => PersistedEnrolment): Promise<void> {
    return this.stockage.lock('session', async () => {
      await this.stockage.update<PersistedEnrolment>(ENROLEMENT, {}, change);
    });
  }
}
