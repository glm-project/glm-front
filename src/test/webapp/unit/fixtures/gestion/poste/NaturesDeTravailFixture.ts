import { err, ok, Result } from '@/app/shared/result/domain/Result';
import { NatureDejaExistante } from '@/gestion/contexts/poste/domain/NatureDejaExistante';
import { NatureDeTravail } from '@/gestion/contexts/poste/domain/NatureDeTravail';
import { NatureDeTravailId } from '@/gestion/contexts/poste/domain/NatureDeTravailId';
import { NatureGeree } from '@/gestion/contexts/poste/domain/NatureGeree';
import { NaturesDeTravailPort } from '@/gestion/contexts/poste/domain/NaturesDeTravailPort';
import { memeNom } from '@/gestion/contexts/poste/domain/RessemblanceDeNature';

export class NaturesDeTravailFixture extends NaturesDeTravailPort {
  liste: readonly NatureGeree[] = [];
  readonly enregistrements: NatureDeTravail[] = [];
  lectureFailure: Error | undefined;
  ecritureFailure: Error | undefined;
  enregistrementDiffere: Promise<Result<void, NatureDejaExistante>> | undefined;

  override natures(): Promise<readonly NatureGeree[]> {
    if (this.lectureFailure !== undefined) return Promise.reject(this.lectureFailure);
    return Promise.resolve([...this.liste].sort((gauche, droite) => gauche.libelle.compare(droite.libelle)));
  }

  override async enregistrer(libelle: NatureDeTravail): Promise<Result<void, NatureDejaExistante>> {
    this.enregistrements.push(libelle);
    if (this.ecritureFailure !== undefined) return Promise.reject(this.ecritureFailure);
    if (this.enregistrementDiffere !== undefined) return this.enregistrementDiffere;
    if (this.liste.some(nature => memeNom(nature.libelle.value, libelle.value))) return err(new NatureDejaExistante());
    this.liste = [...this.liste, new NatureGeree(new NatureDeTravailId(`nature-${String(this.liste.length + 1)}`), libelle, 0)];
    return ok(undefined);
  }
}
