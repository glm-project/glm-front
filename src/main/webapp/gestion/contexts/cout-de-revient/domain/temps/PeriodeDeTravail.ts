import { InstantDeTravail } from './InstantDeTravail';

/** Un intervalle borné à ses deux extrémités. Un travail encore en cours est arrêté à l'instant de la lecture. */
export class PeriodeDeTravail {
  constructor(
    readonly debut: InstantDeTravail,
    readonly fin: InstantDeTravail,
  ) {}
}
