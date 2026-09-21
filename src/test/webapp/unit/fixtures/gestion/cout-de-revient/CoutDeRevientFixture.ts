import { ElementChiffreId } from '@/gestion/contexts/cout-de-revient/domain/element/ElementChiffreId';
import { CoutDeRevient } from '@/gestion/contexts/cout-de-revient/domain/rapport/CoutDeRevient';
import { CoutDeRevientPort } from '@/gestion/contexts/cout-de-revient/domain/rapport/CoutDeRevientPort';

/** Répond au tour suivant, jamais par une promesse déjà résolue : sans quoi l'état de chargement est inobservable. */
const auTourSuivant = <T>(valeur: T): Promise<T> => new Promise(resolve => setTimeout(() => resolve(valeur)));

export class CoutDeRevientFixture extends CoutDeRevientPort {
  readonly demandes: ElementChiffreId[] = [];
  rapports = new Map<string, CoutDeRevient>();
  elementsInconnus = new Set<string>();
  lectureFailure: Error | undefined;
  lectureDifferee: Promise<CoutDeRevient | undefined> | undefined;

  override rapport(element: ElementChiffreId): Promise<CoutDeRevient | undefined> {
    this.demandes.push(element);
    if (this.lectureFailure !== undefined) {
      return Promise.reject(this.lectureFailure);
    }
    if (this.lectureDifferee !== undefined) {
      return this.lectureDifferee;
    }
    if (this.elementsInconnus.has(element.value)) {
      return auTourSuivant(undefined);
    }
    const rapport = this.rapports.get(element.value);
    if (rapport === undefined) {
      /* `undefined` ne veut dire qu'une chose ici : élément inconnu. Un élément non semé est un oubli de scénario. */
      return Promise.reject(new Error(`Aucun rapport semé pour ${element.value}`));
    }
    return auTourSuivant(rapport);
  }
}
