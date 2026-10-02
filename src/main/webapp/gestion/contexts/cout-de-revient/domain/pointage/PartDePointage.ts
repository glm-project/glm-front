import { TotalDeMontant } from '../montant/TotalDeMontant';
import { DureePassee } from '../temps/DureePassee';
import { InstantDeTravail } from '../temps/InstantDeTravail';
import { ActiviteCitee } from './ActiviteCitee';

const estUnNombreDePostes = (diviseur: number): boolean => Number.isInteger(diviseur) && diviseur >= 1;

const estUnDiviseurRecevable = (diviseur: number | undefined): boolean => diviseur === undefined || estUnNombreDePostes(diviseur);

export interface FicheDePart {
  readonly debut: InstantDeTravail;
  readonly fin: InstantDeTravail;
  readonly duree: DureePassee;
  readonly diviseur: number | undefined;
  readonly mainDOeuvre: TotalDeMontant;
  readonly paralleles: readonly ActiviteCitee[];
  readonly bloquants: readonly ActiviteCitee[];
}

export class PartDePointage {
  readonly debut: InstantDeTravail;
  readonly fin: InstantDeTravail;
  readonly duree: DureePassee;
  readonly diviseur: number | undefined;
  readonly mainDOeuvre: TotalDeMontant;
  readonly paralleles: readonly ActiviteCitee[];
  readonly bloquants: readonly ActiviteCitee[];

  constructor(fiche: FicheDePart) {
    if (!estUnDiviseurRecevable(fiche.diviseur)) {
      throw new Error(`Le diviseur « ${String(fiche.diviseur)} » reçu du serveur n’est pas un nombre de postes.`);
    }
    this.debut = fiche.debut;
    this.fin = fiche.fin;
    this.duree = fiche.duree;
    this.diviseur = fiche.diviseur;
    this.mainDOeuvre = fiche.mainDOeuvre;
    this.paralleles = [...fiche.paralleles];
    this.bloquants = [...fiche.bloquants];
  }

  estPartagee(): boolean {
    return this.diviseur !== undefined && this.diviseur > 1;
  }

  partageInconnu(): boolean {
    return this.diviseur === undefined;
  }
}
