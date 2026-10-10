import { err, ok, Result } from '@/app/shared/result/domain/Result';
import { NatureDejaExistante } from '@/gestion/contexts/poste/domain/NatureDejaExistante';
import { NatureDeTravail } from '@/gestion/contexts/poste/domain/NatureDeTravail';
import { NatureDeTravailId } from '@/gestion/contexts/poste/domain/NatureDeTravailId';
import { NatureGeree } from '@/gestion/contexts/poste/domain/NatureGeree';
import { NatureIntrouvable } from '@/gestion/contexts/poste/domain/NatureIntrouvable';
import { NaturePointee } from '@/gestion/contexts/poste/domain/NaturePointee';
import { NaturesDeTravailPort } from '@/gestion/contexts/poste/domain/NaturesDeTravailPort';
import { NatureUtilisee } from '@/gestion/contexts/poste/domain/NatureUtilisee';
import { RefusRenommageNature } from '@/gestion/contexts/poste/domain/RefusRenommageNature';
import { RefusSuppressionNature } from '@/gestion/contexts/poste/domain/RefusSuppressionNature';
import { memeNom } from '@/gestion/contexts/poste/domain/RessemblanceDeNature';

export class NaturesDeTravailFixture extends NaturesDeTravailPort {
  liste: readonly NatureGeree[] = [];
  readonly enregistrements: NatureDeTravail[] = [];
  readonly renommages: [NatureDeTravailId, NatureDeTravail][] = [];
  readonly suppressions: NatureDeTravailId[] = [];
  pointees: readonly string[] = [];
  lectureFailure: Error | undefined;
  ecritureFailure: Error | undefined;
  enregistrementDiffere: Promise<Result<void, NatureDejaExistante>> | undefined;
  renommageDiffere: Promise<Result<void, RefusRenommageNature>> | undefined;
  suppressionDifferee: Promise<Result<void, RefusSuppressionNature>> | undefined;

  override natures(): Promise<readonly NatureGeree[]> {
    if (this.lectureFailure !== undefined) return Promise.reject(this.lectureFailure);
    return Promise.resolve([...this.liste].sort((gauche, droite) => gauche.libelle.value.localeCompare(droite.libelle.value, 'fr')));
  }

  override async enregistrer(libelle: NatureDeTravail): Promise<Result<void, NatureDejaExistante>> {
    this.enregistrements.push(libelle);
    if (this.ecritureFailure !== undefined) return Promise.reject(this.ecritureFailure);
    if (this.enregistrementDiffere !== undefined) return this.enregistrementDiffere;
    if (this.liste.some(nature => memeNom(nature.libelle.value, libelle.value))) return err(new NatureDejaExistante());
    this.liste = [
      ...this.liste,
      new NatureGeree(new NatureDeTravailId(`nature-${String(this.liste.length + 1)}`), libelle, { utilisee: false, postes: 0 }),
    ];
    return ok(undefined);
  }

  override async renommer(id: NatureDeTravailId, libelle: NatureDeTravail): Promise<Result<void, RefusRenommageNature>> {
    this.renommages.push([id, libelle]);
    if (this.ecritureFailure !== undefined) return Promise.reject(this.ecritureFailure);
    if (this.renommageDiffere !== undefined) return this.renommageDiffere;
    const nature = this.liste.find(candidate => candidate.id.value === id.value);
    if (nature === undefined) return err(new NatureIntrouvable());
    if (this.liste.some(autre => autre !== nature && memeNom(autre.libelle.value, libelle.value))) return err(new NatureDejaExistante());
    this.liste = this.liste.map(candidate => (candidate === nature ? new NatureGeree(id, libelle, nature) : candidate));
    return ok(undefined);
  }

  override async supprimer(id: NatureDeTravailId): Promise<Result<void, RefusSuppressionNature>> {
    this.suppressions.push(id);
    if (this.ecritureFailure !== undefined) return Promise.reject(this.ecritureFailure);
    if (this.suppressionDifferee !== undefined) return this.suppressionDifferee;
    const nature = this.liste.find(candidate => candidate.id.value === id.value);
    if (nature === undefined) return err(new NatureIntrouvable());
    if (nature.postes > 0) return err(new NatureUtilisee());
    if (this.pointees.includes(id.value)) return err(new NaturePointee());
    this.liste = this.liste.filter(candidate => candidate !== nature);
    return ok(undefined);
  }
}
