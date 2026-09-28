import { InstantDeReleve } from '../../../domain/releve/InstantDeReleve';

const MINUTES_PAR_HEURE = 60;
const MINUTES_PAR_JOUR = 24 * MINUTES_PAR_HEURE;
const POURCENT = 100;

interface Fenetre {
  readonly debut: number;
  readonly fin: number;
  readonly reperes: readonly number[];
}

const HEURES_DE_JOUR: Fenetre = {
  debut: 6 * MINUTES_PAR_HEURE,
  fin: 22 * MINUTES_PAR_HEURE,
  reperes: [8 * MINUTES_PAR_HEURE, 14 * MINUTES_PAR_HEURE, 20 * MINUTES_PAR_HEURE],
};
const JOUR_ENTIER: Fenetre = { debut: 0, fin: MINUTES_PAR_JOUR, reperes: [0, 12 * MINUTES_PAR_HEURE, MINUTES_PAR_JOUR] };

export type AncrageDuRepere = 'debut' | 'centre' | 'fin';

export interface RepereDeLAxe {
  readonly minutes: number;
  readonly gauche: number;
  readonly ancrage: AncrageDuRepere;
}

const ancrageDe = (gauche: number): AncrageDuRepere => {
  if (gauche <= 0) {
    return 'debut';
  }
  return gauche >= POURCENT ? 'fin' : 'centre';
};

const sortDesHeuresDeJour = (minutes: number): boolean => minutes < HEURES_DE_JOUR.debut || minutes > HEURES_DE_JOUR.fin;

const minutesDe = (instant: InstantDeReleve): number => instant.value.getHours() * MINUTES_PAR_HEURE + instant.value.getMinutes();

const finitUnAutreJour = (debut: InstantDeReleve, fin: InstantDeReleve): boolean => fin.value.toDateString() !== debut.value.toDateString();

export const seLePoursuit = finitUnAutreJour;

export const minutesDeDebut = minutesDe;

export const minutesDeFin = (debut: InstantDeReleve, fin: InstantDeReleve): number =>
  finitUnAutreJour(debut, fin) ? MINUTES_PAR_JOUR : minutesDe(fin);

export class AxeDuJour {
  private constructor(private readonly fenetre: Fenetre) {}

  static de(bornes: readonly number[]): AxeDuJour {
    return new AxeDuJour(bornes.some(sortDesHeuresDeJour) ? JOUR_ENTIER : HEURES_DE_JOUR);
  }

  reperes(): readonly RepereDeLAxe[] {
    return this.fenetre.reperes.map(minutes => {
      const gauche = this.pourcentDe(minutes);
      return { minutes, gauche, ancrage: ancrageDe(gauche) };
    });
  }

  pourcentDe(minutes: number): number {
    return ((minutes - this.fenetre.debut) / (this.fenetre.fin - this.fenetre.debut)) * POURCENT;
  }
}
