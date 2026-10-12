import { DureeTravaillee } from '../duree/DureeTravaillee';

export interface ContenuDuResume {
  readonly tempsPointe: DureeTravaillee;
  readonly joursAvecPointage: number;
  readonly pointages: number;
  readonly finsAutomatiques: number;
}

const compteValide = (valeur: number): boolean => Number.isInteger(valeur) && valeur >= 0;

export class ResumeDuRapport {
  readonly tempsPointe: DureeTravaillee;
  readonly joursAvecPointage: number;
  readonly pointages: number;
  readonly finsAutomatiques: number;

  constructor(contenu: ContenuDuResume) {
    if (![contenu.joursAvecPointage, contenu.pointages, contenu.finsAutomatiques].every(compteValide)) {
      throw new Error('Le résumé reçu du serveur porte un compte invalide.');
    }
    this.tempsPointe = contenu.tempsPointe;
    this.joursAvecPointage = contenu.joursAvecPointage;
    this.pointages = contenu.pointages;
    this.finsAutomatiques = contenu.finsAutomatiques;
  }
}
