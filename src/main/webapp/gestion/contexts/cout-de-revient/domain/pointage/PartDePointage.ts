import { Montant } from '../montant/Montant';
import { DureePassee } from '../temps/DureePassee';
import { InstantDeTravail } from '../temps/InstantDeTravail';
import { ActiviteCitee } from './ActiviteCitee';

const estUnNombreDePostes = (diviseur: number): boolean => Number.isInteger(diviseur) && diviseur >= 1;

export interface FicheDePart {
  readonly debut: InstantDeTravail;
  readonly fin: InstantDeTravail;
  readonly duree: DureePassee;
  readonly diviseur: number;
  readonly mainDOeuvre: Montant;
  readonly paralleles: readonly ActiviteCitee[];
}

export class PartDePointage {
  readonly debut: InstantDeTravail;
  readonly fin: InstantDeTravail;
  readonly duree: DureePassee;
  readonly diviseur: number;
  readonly mainDOeuvre: Montant;
  readonly paralleles: readonly ActiviteCitee[];

  constructor(fiche: FicheDePart) {
    if (!estUnNombreDePostes(fiche.diviseur)) {
      throw new Error(`Le diviseur « ${String(fiche.diviseur)} » reçu du serveur n’est pas un nombre de postes.`);
    }
    this.debut = fiche.debut;
    this.fin = fiche.fin;
    this.duree = fiche.duree;
    this.diviseur = fiche.diviseur;
    this.mainDOeuvre = fiche.mainDOeuvre;
    this.paralleles = [...fiche.paralleles];
  }

  estPartagee(): boolean {
    return this.diviseur > 1;
  }
}
