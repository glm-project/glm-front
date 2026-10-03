import { InstantDeReleve } from '../../../domain/releve/InstantDeReleve';

const MINUTES_PAR_HEURE = 60;
const MINUTES_PAR_JOUR = 24 * MINUTES_PAR_HEURE;
const POURCENT = 100;

interface Fenetre {
  readonly debut: number;
  readonly fin: number;
  readonly reperes: readonly number[];
  readonly reperesDuJourOuvert: readonly number[];
}

const deHeureEnHeure = (debut: number, fin: number, pas: number): readonly number[] =>
  Array.from({ length: (fin - debut) / (pas * MINUTES_PAR_HEURE) + 1 }, (_, rang) => debut + rang * pas * MINUTES_PAR_HEURE);

const HEURES_DE_JOUR: Fenetre = {
  debut: 6 * MINUTES_PAR_HEURE,
  fin: 22 * MINUTES_PAR_HEURE,
  reperes: [8 * MINUTES_PAR_HEURE, 20 * MINUTES_PAR_HEURE],
  reperesDuJourOuvert: deHeureEnHeure(6 * MINUTES_PAR_HEURE, 22 * MINUTES_PAR_HEURE, 2),
};
const JOUR_ENTIER: Fenetre = {
  debut: 0,
  fin: MINUTES_PAR_JOUR,
  reperes: [0, MINUTES_PAR_JOUR],
  reperesDuJourOuvert: deHeureEnHeure(0, MINUTES_PAR_JOUR, 3),
};

export type AncrageDuRepere = 'debut' | 'centre' | 'fin';

export interface RepereDeLAxe {
  readonly minutes: number;
  readonly gauche: number;
  readonly ancrage: AncrageDuRepere;
}

const ancrageDe = (rang: number, nombre: number): AncrageDuRepere => {
  if (rang === 0) {
    return 'debut';
  }
  return rang === nombre - 1 ? 'fin' : 'centre';
};

const sortDesHeuresDeJour = (minutes: number): boolean => minutes < HEURES_DE_JOUR.debut || minutes > HEURES_DE_JOUR.fin;

const minutesDe = (instant: InstantDeReleve): number => instant.value.getHours() * MINUTES_PAR_HEURE + instant.value.getMinutes();

const finitUnAutreJour = (debut: InstantDeReleve, fin: InstantDeReleve): boolean => fin.estUnAutreJourQue(debut);

export const minutesDeDebut = minutesDe;

export const minutesDeFin = (debut: InstantDeReleve, fin: InstantDeReleve): number =>
  finitUnAutreJour(debut, fin) ? MINUTES_PAR_JOUR : minutesDe(fin);

export class AxeDuJour {
  private constructor(private readonly fenetre: Fenetre) {}

  static entier(): AxeDuJour {
    return new AxeDuJour(JOUR_ENTIER);
  }

  static de(bornes: readonly number[]): AxeDuJour {
    return new AxeDuJour(bornes.some(sortDesHeuresDeJour) ? JOUR_ENTIER : HEURES_DE_JOUR);
  }

  reperes(ouvert: boolean): readonly RepereDeLAxe[] {
    const reperes = ouvert ? this.fenetre.reperesDuJourOuvert : this.fenetre.reperes;
    return reperes.map((minutes, rang) => ({ minutes, gauche: this.pourcentDe(minutes), ancrage: ancrageDe(rang, reperes.length) }));
  }

  pourcentDe(minutes: number): number {
    return ((minutes - this.fenetre.debut) / (this.fenetre.fin - this.fenetre.debut)) * POURCENT;
  }
}
