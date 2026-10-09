import { DureeTravaillee } from './duree/DureeTravaillee';
import { LigneDePointage } from './LigneDePointage';
import { JourCalendaire } from './semaine/JourCalendaire';

export class JourDePointages {
  constructor(
    readonly jour: JourCalendaire,
    readonly total: DureeTravaillee,
    readonly lignes: readonly LigneDePointage[],
  ) {}

  estPointe(): boolean {
    return this.lignes.length > 0;
  }

  activitesEnCours(): number {
    return this.lignes.filter(ligne => ligne.etat.etat === 'EN_COURS').length;
  }

  aUneFinAutomatique(): boolean {
    return this.lignes.some(ligne => ligne.etat.etat === 'TERMINEE_AUTOMATIQUEMENT');
  }
}
