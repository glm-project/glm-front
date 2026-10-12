import { JourCalendaire } from '../semaine/JourCalendaire';

const PREMIERE_ANNEE = 2000;
const DERNIERE_ANNEE = 2999;
const JANVIER = 1;
const DECEMBRE = 12;

const anneeHorsBornes = (annee: number): boolean => !Number.isInteger(annee) || annee < PREMIERE_ANNEE || annee > DERNIERE_ANNEE;

const moisHorsBornes = (mois: number): boolean => !Number.isInteger(mois) || mois < JANVIER || mois > DECEMBRE;

const deuxChiffres = (valeur: number): string => String(valeur).padStart(2, '0');

export class MoisCivil {
  constructor(
    readonly annee: number,
    readonly mois: number,
  ) {
    if (anneeHorsBornes(annee)) {
      throw new Error(`L’année d’un mois se situe entre ${PREMIERE_ANNEE} et ${DERNIERE_ANNEE}.`);
    }
    if (moisHorsBornes(mois)) {
      throw new Error(`Le mois ${mois} n’existe pas.`);
    }
  }

  static contenant(jour: JourCalendaire): MoisCivil {
    return new MoisCivil(Number(jour.value.slice(0, 4)), Number(jour.value.slice(5, 7)));
  }

  premierJour(): JourCalendaire {
    return new JourCalendaire(`${this.annee}-${deuxChiffres(this.mois)}-01`);
  }

  dernierJour(): JourCalendaire {
    if (this.mois === DECEMBRE) {
      return new JourCalendaire(`${this.annee}-12-31`);
    }
    return new MoisCivil(this.annee, this.mois + 1).premierJour().plus(-1);
  }

  precedent(): MoisCivil | undefined {
    if (this.mois > JANVIER) {
      return new MoisCivil(this.annee, this.mois - 1);
    }
    return this.annee === PREMIERE_ANNEE ? undefined : new MoisCivil(this.annee - 1, DECEMBRE);
  }

  suivant(): MoisCivil | undefined {
    if (this.mois < DECEMBRE) {
      return new MoisCivil(this.annee, this.mois + 1);
    }
    return this.annee === DERNIERE_ANNEE ? undefined : new MoisCivil(this.annee + 1, JANVIER);
  }
}
