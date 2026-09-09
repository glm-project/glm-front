import { Tokens } from './DeviceGrantClient';
import { JetonDAcces } from './JetonDAcces';

const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_A_TOKEN_LASTS_UNLESS_TOLD = 60;
const RENEWAL_MARGIN_SECONDS = 30;
const SHORTEST_RENEWAL_DELAY_SECONDS = 5;

export interface StoredSession {
  accessToken: string;
  expiresAt: number;
  refreshToken: string;
  tenant?: string;
}

const isASaneLifetime = (seconds: number | undefined): seconds is number =>
  seconds !== undefined && Number.isFinite(seconds) && seconds > 0;

const lifetimeOf = ({ expires_in }: Tokens): number => (isASaneLifetime(expires_in) ? expires_in : SECONDS_A_TOKEN_LASTS_UNLESS_TOLD);

const grantedDocument = (tokens: Tokens, now: number): StoredSession => {
  const stored: StoredSession = {
    accessToken: tokens.access_token,
    expiresAt: now + lifetimeOf(tokens) * MILLISECONDS_PER_SECOND,
    refreshToken: tokens.refresh_token,
  };
  const tenant = JetonDAcces.of(tokens.access_token).tenant();
  if (tenant !== undefined) {
    stored.tenant = tenant;
  }
  return stored;
};

export class SessionDAppareil {
  private constructor(
    private readonly stored: StoredSession,
    private readonly lifetimeSeconds: number | undefined,
  ) {}

  static granted(tokens: Tokens, now: number): SessionDAppareil {
    return new SessionDAppareil(grantedDocument(tokens, now), lifetimeOf(tokens));
  }

  static restored(stored: StoredSession | undefined): SessionDAppareil | undefined {
    return stored === undefined ? undefined : new SessionDAppareil(stored, undefined);
  }

  static same(left: SessionDAppareil | undefined, right: SessionDAppareil | undefined): boolean {
    return left === undefined ? right === undefined : left.hasSameDocumentAs(right);
  }

  document(): StoredSession {
    return this.stored;
  }

  refreshToken(): string {
    return this.stored.refreshToken;
  }

  tenant(): string | undefined {
    return this.stored.tenant;
  }

  accessTokenAt(now: number): string | undefined {
    return this.hasExpired(now) ? undefined : this.stored.accessToken;
  }

  hasSameRefreshTokenAs(other: SessionDAppareil): boolean {
    return this.stored.refreshToken === other.stored.refreshToken;
  }

  secondsBeforeRenewing(): number {
    if (this.lifetimeSeconds === undefined) {
      return SHORTEST_RENEWAL_DELAY_SECONDS;
    }
    return Math.max(this.lifetimeSeconds - RENEWAL_MARGIN_SECONDS, SHORTEST_RENEWAL_DELAY_SECONDS);
  }

  private hasExpired(now: number): boolean {
    return now >= this.stored.expiresAt;
  }

  private hasSameDocumentAs(other: SessionDAppareil | undefined): boolean {
    return (
      other !== undefined
      && this.stored.accessToken === other.stored.accessToken
      && this.stored.expiresAt === other.stored.expiresAt
      && this.stored.refreshToken === other.stored.refreshToken
      && this.stored.tenant === other.stored.tenant
    );
  }
}
