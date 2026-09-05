export interface ExpirationDesignation {
  expire: () => void;
}

export abstract class PlanificationExpirationDesignationPort {
  abstract schedule(deadline: number | undefined, expiration: ExpirationDesignation): void;
}
