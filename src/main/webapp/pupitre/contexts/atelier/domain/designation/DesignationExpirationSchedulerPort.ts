export interface DesignationExpiration {
  readonly expire: () => void;
}

export abstract class DesignationExpirationSchedulerPort {
  abstract schedule(deadline: number | undefined, expiration: DesignationExpiration): void;
}
