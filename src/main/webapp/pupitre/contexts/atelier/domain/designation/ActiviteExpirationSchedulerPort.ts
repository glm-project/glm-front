import { DesignationExpiration } from './DesignationExpirationSchedulerPort';

export abstract class ActiviteExpirationSchedulerPort {
  abstract schedule(deadline: number | undefined, expiration: DesignationExpiration): void;
}
