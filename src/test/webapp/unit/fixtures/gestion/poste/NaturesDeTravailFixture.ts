import { err, ok, Result } from '@/app/shared/result/domain/Result';
import { NatureDejaExistante } from '@/gestion/contexts/poste/domain/NatureDejaExistante';
import { NatureDeTravail } from '@/gestion/contexts/poste/domain/NatureDeTravail';
import { NatureDeTravailId } from '@/gestion/contexts/poste/domain/NatureDeTravailId';
import { NatureGeree } from '@/gestion/contexts/poste/domain/NatureGeree';
import { NatureIntrouvable } from '@/gestion/contexts/poste/domain/NatureIntrouvable';
import { NaturesDeTravailPort } from '@/gestion/contexts/poste/domain/NaturesDeTravailPort';
import { RefusRenommageNature } from '@/gestion/contexts/poste/domain/RefusRenommageNature';
import { memeNom } from '@/gestion/contexts/poste/domain/RessemblanceDeNature';

export class NaturesDeTravailFixture extends NaturesDeTravailPort {
  liste: readonly NatureGeree[] = [];
  readonly enregistrements: NatureDeTravail[] = [];
  readonly renommages: [NatureDeTravailId, NatureDeTravail][] = [];
  lectureFailure: Error | undefined;
  ecritureFailure: Error | undefined;
  enregistrementDiffere: Promise<Result<void, NatureDejaExistante>> | undefined;
  renommageDiffere: Promise<Result<void, RefusRenommageNature>> | undefined;

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

  override async renommer(id: NatureDeTravailId, libelle: NatureDeTravail): Promise<Result<void, RefusRenommageNature>> {
    this.renommages.push([id, libelle]);
    if (this.ecritureFailure !== undefined) return Promise.reject(this.ecritureFailure);
    if (this.renommageDiffere !== undefined) return this.renommageDiffere;
    const nature = this.liste.find(candidate => candidate.id.value === id.value);
    if (nature === undefined) return err(new NatureIntrouvable());
    if (this.liste.some(autre => autre !== nature && memeNom(autre.libelle.value, libelle.value))) return err(new NatureDejaExistante());
    this.liste = this.liste.map(candidate => (candidate === nature ? new NatureGeree(id, libelle, nature.postes) : candidate));
    return ok(undefined);
  }
}
