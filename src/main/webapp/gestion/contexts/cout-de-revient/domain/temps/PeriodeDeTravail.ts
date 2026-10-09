import { InstantDeTravail } from './InstantDeTravail';

export class PeriodeDeTravail {
  constructor(
    readonly debut: InstantDeTravail,
    readonly fin: InstantDeTravail,
  ) {}
}
