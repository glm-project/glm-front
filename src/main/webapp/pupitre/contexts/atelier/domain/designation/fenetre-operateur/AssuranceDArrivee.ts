import { GesteDAtelier } from '../../journal-du-pupitre/JournalDuPupitre';

export class AssuranceDArrivee {
  constructor(private readonly assuree = false) {}

  isAssuree(): boolean {
    return this.assuree;
  }

  afterAccept(gestes: readonly GesteDAtelier[]): AssuranceDArrivee {
    if (this.containsArrivee(gestes)) return new AssuranceDArrivee(true);
    return this;
  }

  private containsArrivee(gestes: readonly GesteDAtelier[]): boolean {
    return gestes.some(geste => geste.nature === 'ARRIVEE');
  }
}
