import { ok, Result } from '@/app/shared/result/domain/Result';
import { CommandeCreationPoste } from '@/gestion/contexts/poste/domain/CommandeCreationPoste';
import { CommandeModificationPoste } from '@/gestion/contexts/poste/domain/CommandeModificationPoste';
import { NatureDeTravail } from '@/gestion/contexts/poste/domain/NatureDeTravail';
import { PosteDeTravail } from '@/gestion/contexts/poste/domain/PosteDeTravail';
import { PosteDeTravailId } from '@/gestion/contexts/poste/domain/PosteDeTravailId';
import { PostesPort } from '@/gestion/contexts/poste/domain/PostesPort';
import { RefusCreationPoste } from '@/gestion/contexts/poste/domain/RefusCreationPoste';
import { RefusModificationPoste } from '@/gestion/contexts/poste/domain/RefusModificationPoste';
import { RefusSuppressionPoste } from '@/gestion/contexts/poste/domain/RefusSuppressionPoste';

import { SignalFixture } from '@test/unit/fixtures/SignalFixture';

const configurationDe = (commande: CommandeCreationPoste | CommandeModificationPoste) => ({
  ...commande,
  nature: new NatureDeTravail(commande.natureId.value.replace('nature-', '')),
});

export class PostesFixture extends PostesPort {
  liste: readonly PosteDeTravail[] = [];
  readonly enregistrements: (CommandeCreationPoste | CommandeModificationPoste)[] = [];
  readonly suppressions: PosteDeTravailId[] = [];
  creation: Result<void, RefusCreationPoste> = ok(undefined);
  modification: Result<void, RefusModificationPoste> = ok(undefined);
  suppression: Result<void, RefusSuppressionPoste> = ok(undefined);
  lectureFailure: Error | undefined;
  ecritureFailure: Error | undefined;
  lectureDifferee: Promise<readonly PosteDeTravail[]> | undefined;
  creationDifferee: Promise<Result<void, RefusCreationPoste>> | undefined;
  suppressionDifferee: Promise<Result<void, RefusSuppressionPoste>> | undefined;
  private lectureSignal: SignalFixture | undefined;

  signalLecture(): Promise<void> {
    this.lectureSignal = new SignalFixture();
    return this.lectureSignal.promise;
  }

  override referentiel(): Promise<readonly PosteDeTravail[]> {
    this.lectureSignal?.release();
    this.lectureSignal = undefined;
    if (this.lectureFailure !== undefined) return Promise.reject(this.lectureFailure);
    return this.lectureDifferee ?? Promise.resolve(this.liste);
  }

  override async creer(commande: CommandeCreationPoste): Promise<Result<void, RefusCreationPoste>> {
    this.enregistrements.push(commande);
    const resultat = await this.answerEnregistrement(this.creationDifferee ?? Promise.resolve(this.creation));
    if (resultat.ok) {
      this.liste = [...this.liste, new PosteDeTravail(new PosteDeTravailId('created-poste'), configurationDe(commande))];
    }
    return resultat;
  }

  override async modifier(commande: CommandeModificationPoste): Promise<Result<void, RefusModificationPoste>> {
    this.enregistrements.push(commande);
    const resultat = await this.answerEnregistrement(Promise.resolve(this.modification));
    if (resultat.ok) {
      this.liste = this.liste.map(poste =>
        poste.id.value === commande.id.value ? new PosteDeTravail(poste.id, configurationDe(commande)) : poste,
      );
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

  private answerEnregistrement<Refus>(resultat: Promise<Result<void, Refus>>): Promise<Result<void, Refus>> {
    if (this.ecritureFailure !== undefined) return Promise.reject(this.ecritureFailure);
    return resultat;
  }
}
