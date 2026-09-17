import { ReleveDesHeures } from '@/gestion/contexts/releve-des-heures/domain/releve/ReleveDesHeures';
import { DemandeDeReleve, SyntheseDesHeuresPort } from '@/gestion/contexts/releve-des-heures/domain/releve/SyntheseDesHeuresPort';

const cleDe = (demande: DemandeDeReleve): string =>
  `${demande.operateur.value}|${String(demande.semaine.annee)}|${String(demande.semaine.numero)}`;

/** Répond au tour suivant, jamais par une promesse déjà résolue : sans quoi l'état de chargement est inobservable. */
const auTourSuivant = <T>(valeur: T): Promise<T> => new Promise(resolve => setTimeout(() => resolve(valeur)));

export class SyntheseDesHeuresFixture extends SyntheseDesHeuresPort {
  readonly demandes: DemandeDeReleve[] = [];
  releves = new Map<string, ReleveDesHeures>();
  operateursInconnus = new Set<string>();
  lectureFailure: Error | undefined;
  lectureDifferee: Promise<ReleveDesHeures | undefined> | undefined;

  override synthese(demande: DemandeDeReleve): Promise<ReleveDesHeures | undefined> {
    this.demandes.push(demande);
    if (this.lectureFailure !== undefined) {
      return Promise.reject(this.lectureFailure);
    }
    if (this.lectureDifferee !== undefined) {
      return this.lectureDifferee;
    }
    if (this.operateursInconnus.has(demande.operateur.value)) {
      return auTourSuivant(undefined);
    }
    const releve = this.releves.get(cleDe(demande));
    if (releve === undefined) {
      /* `undefined` ne veut dire qu'une chose ici : opérateur inconnu. Une semaine non semée est un oubli de scénario. */
      return Promise.reject(new Error(`Aucun relevé semé pour ${cleDe(demande)}`));
    }
    return auTourSuivant(releve);
  }
}
