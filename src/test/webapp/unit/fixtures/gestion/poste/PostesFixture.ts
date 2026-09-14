import { Page } from '@/app/shared/pagination/domain/Page';
import { ok, Result } from '@/app/shared/result/domain/Result';
import { CommandeCreationPoste } from '@/gestion/contexts/poste/domain/CommandeCreationPoste';
import { CommandeModificationPoste } from '@/gestion/contexts/poste/domain/CommandeModificationPoste';
import { LibellePosteDejaUtilise } from '@/gestion/contexts/poste/domain/LibellePosteDejaUtilise';
import { NatureDeTravail } from '@/gestion/contexts/poste/domain/NatureDeTravail';
import { PosteDeTravail } from '@/gestion/contexts/poste/domain/PosteDeTravail';
import { PosteDeTravailId } from '@/gestion/contexts/poste/domain/PosteDeTravailId';
import { PostesPort } from '@/gestion/contexts/poste/domain/PostesPort';
import { RefusModificationPoste } from '@/gestion/contexts/poste/domain/RefusModificationPoste';
import { RefusSuppressionPoste } from '@/gestion/contexts/poste/domain/RefusSuppressionPoste';
import { RequetePostes } from '@/gestion/contexts/poste/domain/RequetePostes';

import { SignalFixture } from '@test/unit/fixtures/SignalFixture';

export class PostesFixture extends PostesPort {
  liste: readonly PosteDeTravail[] = [];
  suggestions: readonly NatureDeTravail[] = [];
  readonly enregistrements: (CommandeCreationPoste | CommandeModificationPoste)[] = [];
  readonly suppressions: PosteDeTravailId[] = [];
  enregistrement: Result<void, RefusModificationPoste> = ok(undefined);
  suppression: Result<void, RefusSuppressionPoste> = ok(undefined);
  lectureFailure: Error | undefined;
  ecritureFailure: Error | undefined;
  lectureDifferee: Promise<Page<PosteDeTravail>> | undefined;
  ecritureDifferee: Promise<Result<void, RefusModificationPoste>> | undefined;
  suppressionDifferee: Promise<Result<void, RefusSuppressionPoste>> | undefined;
  private lectureSignal: SignalFixture | undefined;

  signalLecture(): Promise<void> {
    this.lectureSignal = new SignalFixture();
    return this.lectureSignal.promise;
  }

  override postes(requete: RequetePostes): Promise<Page<PosteDeTravail>> {
    this.lectureSignal?.release();
    this.lectureSignal = undefined;
    if (this.lectureFailure !== undefined) return Promise.reject(this.lectureFailure);
    return (
      this.lectureDifferee
      ?? Promise.resolve(new Page(this.liste.slice(requete.page * requete.taille, (requete.page + 1) * requete.taille), this.liste.length))
    );
  }

  override natures(): Promise<readonly NatureDeTravail[]> {
    if (this.suggestions.length > 0) {
      return Promise.resolve(this.suggestions);
    }
    const distinct = new Map<string, NatureDeTravail>();
    for (const poste of this.liste) {
      const cle = poste.nature.cleNormalisee();
      if (!distinct.has(cle)) {
        distinct.set(cle, poste.nature);
      }
    }
    return Promise.resolve([...distinct.values()].sort((left, right) => left.compare(right)));
  }

  override async creer(commande: CommandeCreationPoste): Promise<Result<void, LibellePosteDejaUtilise>> {
    this.enregistrements.push(commande);
    const resultat = (await this.answerEnregistrement()) as Result<void, LibellePosteDejaUtilise>;
    if (resultat.ok) {
      this.liste = [...this.liste, new PosteDeTravail(new PosteDeTravailId('created-poste'), commande)];
    }
    return resultat;
  }

  override async modifier(commande: CommandeModificationPoste): Promise<Result<void, RefusModificationPoste>> {
    this.enregistrements.push(commande);
    const resultat = await this.answerEnregistrement();
    if (resultat.ok) {
      this.liste = this.liste.map(poste => (poste.identifiePar(commande.id) ? poste.modifier(commande) : poste));
    }
    return resultat;
  }

  override async supprimer(id: PosteDeTravailId): Promise<Result<void, RefusSuppressionPoste>> {
    this.suppressions.push(id);
    if (this.ecritureFailure !== undefined) return Promise.reject(this.ecritureFailure);
    const resultat = await (this.suppressionDifferee ?? Promise.resolve(this.suppression));
    if (resultat.ok) {
      this.liste = this.liste.filter(poste => !poste.identifiePar(id));
    }
    return resultat;
  }

  private answerEnregistrement(): Promise<Result<void, RefusModificationPoste>> {
    if (this.ecritureFailure !== undefined) return Promise.reject(this.ecritureFailure);
    return this.ecritureDifferee ?? Promise.resolve(this.enregistrement);
  }
}
