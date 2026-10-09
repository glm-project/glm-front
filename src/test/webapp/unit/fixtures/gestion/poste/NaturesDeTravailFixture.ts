import { NatureGeree } from '@/gestion/contexts/poste/domain/NatureGeree';
import { NaturesDeTravailPort } from '@/gestion/contexts/poste/domain/NaturesDeTravailPort';

export class NaturesDeTravailFixture extends NaturesDeTravailPort {
  liste: readonly NatureGeree[] = [];
  lectureFailure: Error | undefined;

  override natures(): Promise<readonly NatureGeree[]> {
    if (this.lectureFailure !== undefined) return Promise.reject(this.lectureFailure);
    return Promise.resolve([...this.liste].sort((gauche, droite) => gauche.libelle.compare(droite.libelle)));
  }
}
