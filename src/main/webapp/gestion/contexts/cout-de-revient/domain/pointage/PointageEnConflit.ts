import { InstantDeTravail } from '../temps/InstantDeTravail';

export type TypeDePointage = 'DEBUT' | 'NON_CONFORMITE' | 'FIN';

export class PointageEnConflit {
  constructor(
    readonly id: string,
    readonly type: TypeDePointage,
    readonly survenue: InstantDeTravail,
  ) {}
}
