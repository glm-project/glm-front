import { Page } from '@/app/shared/pagination/domain/Page';
import { ok, Result } from '@/app/shared/result/domain/Result';
import { CommandeEnregistrementPoste } from '@/gestion/contexts/poste/domain/CommandeEnregistrementPoste';
import { NatureDeTravail } from '@/gestion/contexts/poste/domain/NatureDeTravail';
import { PosteDeTravail } from '@/gestion/contexts/poste/domain/PosteDeTravail';
import { PosteDeTravailId } from '@/gestion/contexts/poste/domain/PosteDeTravailId';
import { PostesPort } from '@/gestion/contexts/poste/domain/PostesPort';
import { RefusEnregistrementPoste } from '@/gestion/contexts/poste/domain/RefusEnregistrementPoste';
import { RefusSuppressionPoste } from '@/gestion/contexts/poste/domain/RefusSuppressionPoste';

export class PostesFixture extends PostesPort {
  liste: readonly PosteDeTravail[] = [];
  suggestions: readonly NatureDeTravail[] = [];
  readonly enregistrements: { id: PosteDeTravailId | undefined; commande: CommandeEnregistrementPoste }[] = [];
  readonly suppressions: PosteDeTravailId[] = [];
  enregistrement: Result<void, RefusEnregistrementPoste> = ok(undefined);
  suppression: Result<void, RefusSuppressionPoste> = ok(undefined);
  lectureFailure: Error | undefined;
  ecritureFailure: Error | undefined;
  lectureDifferee: Promise<Page<PosteDeTravail>> | undefined;
  ecritureDifferee: Promise<Result<void, RefusEnregistrementPoste>> | undefined;
  suppressionDifferee: Promise<Result<void, RefusSuppressionPoste>> | undefined;

  override postes(page: number, taille: number): Promise<Page<PosteDeTravail>> {
    if (this.lectureFailure !== undefined) return Promise.reject(this.lectureFailure);
    return this.lectureDifferee ?? Promise.resolve(new Page(this.liste.slice(page * taille, (page + 1) * taille), this.liste.length));
  }
  override natures(): Promise<readonly NatureDeTravail[]> {
    return Promise.resolve(this.suggestions);
  }
  override async creer(commande: CommandeEnregistrementPoste): Promise<Result<void, RefusEnregistrementPoste>> {
    this.enregistrements.push({ id: undefined, commande });
    const resultat = await this.answerEnregistrement();
    if (resultat.ok) {
      this.liste = [...this.liste, new PosteDeTravail(new PosteDeTravailId('created-poste'), commande)];
    }
    return resultat;
  }
  override async modifier(id: PosteDeTravailId, commande: CommandeEnregistrementPoste): Promise<Result<void, RefusEnregistrementPoste>> {
    this.enregistrements.push({ id, commande });
    const resultat = await this.answerEnregistrement();
    if (resultat.ok) {
      this.liste = this.liste.map(poste => (poste.id.value === id.value ? new PosteDeTravail(id, commande) : poste));
    }
    return resultat;
  }
  override async supprimer(id: PosteDeTravailId): Promise<Result<void, RefusSuppressionPoste>> {
    this.suppressions.push(id);
    if (this.ecritureFailure !== undefined) return Promise.reject(this.ecritureFailure);
    const resultat = await (this.suppressionDifferee ?? Promise.resolve(this.suppression));
    if (resultat.ok) {
      this.liste = this.liste.filter(poste => poste.id.value !== id.value);
    }
    return resultat;
  }
  private answerEnregistrement(): Promise<Result<void, RefusEnregistrementPoste>> {
    if (this.ecritureFailure !== undefined) return Promise.reject(this.ecritureFailure);
    return this.ecritureDifferee ?? Promise.resolve(this.enregistrement);
  }
}
