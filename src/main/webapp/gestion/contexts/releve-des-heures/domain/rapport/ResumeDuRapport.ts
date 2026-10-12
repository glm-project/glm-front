import { DureeTravaillee } from '../duree/DureeTravaillee';

export interface ContenuDuResume {
  readonly tempsPointe: DureeTravaillee;
  readonly joursAvecPointage: number;
}

const compteValide = (valeur: number): boolean => Number.isInteger(valeur) && valeur >= 0;

export class ResumeDuRapport {
  readonly tempsPointe: DureeTravaillee;
  readonly joursAvecPointage: number;

  constructor(contenu: ContenuDuResume) {
    if (!compteValide(contenu.joursAvecPointage)) {
      throw new Error('Le résumé reçu du serveur porte un compte invalide.');
    }
    this.tempsPointe = contenu.tempsPointe;
    this.joursAvecPointage = contenu.joursAvecPointage;
  }
}
