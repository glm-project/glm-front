import { DureeTravaillee } from '../duree/DureeTravaillee';
import { SemaineISO } from '../semaine/SemaineISO';
import { IdentiteOperateur } from './IdentiteOperateur';
import { JourDeReleve } from './JourDeReleve';

const memesJours = (attendus: readonly { readonly value: string }[], jours: readonly JourDeReleve[]): boolean =>
  attendus.every((attendu, rang) => jours[rang]?.jour.value === attendu.value);

const couvreLaSemaine = (semaine: SemaineISO, jours: readonly JourDeReleve[]): boolean => {
  const attendus = semaine.jours();
  if (attendus.length !== jours.length) {
    return false;
  }
  return memesJours(attendus, jours);
};

export interface FicheDuReleve {
  readonly operateur: IdentiteOperateur;
  readonly jours: readonly JourDeReleve[];
  readonly totalPointe: DureeTravaillee;
  readonly totalPresume: DureeTravaillee;
}

export class ReleveDesHeures {
  readonly operateur: IdentiteOperateur;
  readonly jours: readonly JourDeReleve[];
  readonly totalPointe: DureeTravaillee;
  readonly totalPresume: DureeTravaillee;

  constructor(semaine: SemaineISO, fiche: FicheDuReleve) {
    ReleveDesHeures.verifieLesSeptJours(semaine, fiche.jours);
    this.operateur = fiche.operateur;
    this.jours = [...fiche.jours];
    this.totalPointe = fiche.totalPointe;
    this.totalPresume = fiche.totalPresume;
  }

  private static verifieLesSeptJours(semaine: SemaineISO, jours: readonly JourDeReleve[]): void {
    if (!couvreLaSemaine(semaine, jours)) {
      throw new Error('Le relevé reçu du serveur ne couvre pas les sept jours de la semaine demandée.');
    }
  }
}
