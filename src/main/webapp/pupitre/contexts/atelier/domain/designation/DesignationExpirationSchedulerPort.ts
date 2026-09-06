export interface DesignationExpiration {
  expire: () => void;
}

export abstract class DesignationExpirationSchedulerPort {
  abstract schedule(deadline: number | undefined, expiration: DesignationExpiration): void;
}
