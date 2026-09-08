import { Tokens } from './DeviceGrantClient';
import { JetonDAcces } from './JetonDAcces';

const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_A_TOKEN_LASTS_UNLESS_TOLD = 60;
const RENEWAL_MARGIN_SECONDS = 30;
const SHORTEST_RENEWAL_DELAY_SECONDS = 5;

export interface SessionStockee {
  accessToken: string;
  expiresAt: number;
  refreshToken: string;
  tenant?: string;
}

const isASaneLifetime = (seconds: number | undefined): seconds is number =>
  seconds !== undefined && Number.isFinite(seconds) && seconds > 0;

const lifetimeOf = ({ expires_in }: Tokens): number => (isASaneLifetime(expires_in) ? expires_in : SECONDS_A_TOKEN_LASTS_UNLESS_TOLD);

const grantedDocument = (tokens: Tokens, maintenant: number): SessionStockee => {
  const stockee: SessionStockee = {
    accessToken: tokens.access_token,
    expiresAt: maintenant + lifetimeOf(tokens) * MILLISECONDS_PER_SECOND,
    refreshToken: tokens.refresh_token,
  };
  const tenant = JetonDAcces.of(tokens.access_token).tenant();
  if (tenant !== undefined) {
    stockee.tenant = tenant;
  }
  return stockee;
};

export class SessionDAppareil {
  private constructor(
    private readonly stockee: SessionStockee,
    private readonly dureeDeVieSecondes: number | undefined,
  ) {}

  static granted(tokens: Tokens, maintenant: number): SessionDAppareil {
    return new SessionDAppareil(grantedDocument(tokens, maintenant), lifetimeOf(tokens));
  }

  static restored(stockee: SessionStockee | undefined): SessionDAppareil | undefined {
    return stockee === undefined ? undefined : new SessionDAppareil(stockee, undefined);
  }

  static same(left: SessionDAppareil | undefined, right: SessionDAppareil | undefined): boolean {
    return left === undefined ? right === undefined : left.hasSameDocumentAs(right);
  }

  document(): SessionStockee {
    return this.stockee;
  }

  refreshToken(): string {
    return this.stockee.refreshToken;
  }

  tenant(): string | undefined {
    return this.stockee.tenant;
  }

  accessTokenAt(maintenant: number): string | undefined {
    return this.hasExpired(maintenant) ? undefined : this.stockee.accessToken;
  }

  hasSameRefreshTokenAs(other: SessionDAppareil): boolean {
    return this.stockee.refreshToken === other.stockee.refreshToken;
  }

  secondsBeforeRenewing(): number {
    if (this.dureeDeVieSecondes === undefined) {
      return SHORTEST_RENEWAL_DELAY_SECONDS;
    }
    return Math.max(this.dureeDeVieSecondes - RENEWAL_MARGIN_SECONDS, SHORTEST_RENEWAL_DELAY_SECONDS);
  }

  private hasExpired(maintenant: number): boolean {
    return maintenant >= this.stockee.expiresAt;
  }

  private hasSameDocumentAs(other: SessionDAppareil | undefined): boolean {
    return (
      other !== undefined
      && this.stockee.accessToken === other.stockee.accessToken
      && this.stockee.expiresAt === other.stockee.expiresAt
      && this.stockee.refreshToken === other.stockee.refreshToken
      && this.stockee.tenant === other.stockee.tenant
    );
  }
}
