import { SemaineISO } from './SemaineISO';

const MOIS_PAR_AN = 12;

const estUnNumeroDeMois = (numero: number): boolean => Number.isInteger(numero) && numero >= 1 && numero <= MOIS_PAR_AN;

export class MoisCalendaire {
  constructor(
    readonly annee: number,
    readonly numero: number,
  ) {
    if (!estUnNumeroDeMois(numero)) {
      throw new Error(`Le mois ${String(numero)} n’existe pas.`);
    }
  }

  static deLaSemaine(semaine: SemaineISO): MoisCalendaire {
    const lundi = semaine.lundi().value;
    return new MoisCalendaire(Number(lundi.slice(0, 4)), Number(lundi.slice(5, 7)));
  }

  static deLAnnee(annee: number): readonly MoisCalendaire[] {
    return Array.from({ length: MOIS_PAR_AN }, (_, rang) => new MoisCalendaire(annee, rang + 1));
  }

  estLeMeme(autre: MoisCalendaire): boolean {
    return this.annee === autre.annee && this.numero === autre.numero;
  }
}
