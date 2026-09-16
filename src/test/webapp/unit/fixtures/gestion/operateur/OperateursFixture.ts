import { Page } from '@/app/shared/pagination/domain/Page';
import { ok, Result } from '@/app/shared/result/domain/Result';
import { CommandeCreationOperateur } from '@/gestion/contexts/operateur/domain/CommandeCreationOperateur';
import { CommandeModificationOperateur } from '@/gestion/contexts/operateur/domain/CommandeModificationOperateur';
import { Operateur } from '@/gestion/contexts/operateur/domain/Operateur';
import { OperateurId } from '@/gestion/contexts/operateur/domain/OperateurId';
import { OperateursPort } from '@/gestion/contexts/operateur/domain/OperateursPort';
import { PosteHabilitable } from '@/gestion/contexts/operateur/domain/PosteHabilitable';
import { PosteHabilitableId } from '@/gestion/contexts/operateur/domain/PosteHabilitableId';
import { RefusCreationOperateur } from '@/gestion/contexts/operateur/domain/RefusCreationOperateur';
import { RefusModificationOperateur } from '@/gestion/contexts/operateur/domain/RefusModificationOperateur';
import { RefusSuppressionOperateur } from '@/gestion/contexts/operateur/domain/RefusSuppressionOperateur';
import { RequeteOperateurs } from '@/gestion/contexts/operateur/domain/RequeteOperateurs';

import { SignalFixture } from '@test/unit/fixtures/SignalFixture';

const resoudre = (catalogue: readonly PosteHabilitable[], ids: readonly PosteHabilitableId[]): readonly PosteHabilitable[] =>
  catalogue.filter(poste => ids.some(id => id.value === poste.id.value)).sort((left, right) => left.compare(right));

const naturesDe = (postes: readonly PosteHabilitable[]): readonly string[] =>
  [...new Set(postes.map(poste => poste.nature))].sort((left, right) => left.localeCompare(right, 'fr'));

export class OperateursFixture extends OperateursPort {
  liste: readonly Operateur[] = [];
  catalogue: readonly PosteHabilitable[] = [];
  readonly enregistrements: (CommandeCreationOperateur | CommandeModificationOperateur)[] = [];
  readonly suppressions: OperateurId[] = [];
  creation: Result<void, RefusCreationOperateur> = ok(undefined);
  modification: Result<void, RefusModificationOperateur> = ok(undefined);
  suppression: Result<void, RefusSuppressionOperateur> = ok(undefined);
  lectureFailure: Error | undefined;
  ecritureFailure: Error | undefined;
  lectureDifferee: Promise<Page<Operateur>> | undefined;
  creationDifferee: Promise<Result<void, RefusCreationOperateur>> | undefined;
  suppressionDifferee: Promise<Result<void, RefusSuppressionOperateur>> | undefined;
  private lectureSignal: SignalFixture | undefined;

  signalLecture(): Promise<void> {
    this.lectureSignal = new SignalFixture();
    return this.lectureSignal.promise;
  }

  override operateurs(requete: RequeteOperateurs): Promise<Page<Operateur>> {
    this.lectureSignal?.release();
    this.lectureSignal = undefined;
    if (this.lectureFailure !== undefined) return Promise.reject(this.lectureFailure);
    return (
      this.lectureDifferee
      ?? Promise.resolve(new Page(this.liste.slice(requete.page * requete.taille, (requete.page + 1) * requete.taille), this.liste.length))
    );
  }

  override postesHabilitables(): Promise<readonly PosteHabilitable[]> {
    return Promise.resolve([...this.catalogue].sort((left, right) => left.compare(right)));
  }

  override async creer(commande: CommandeCreationOperateur): Promise<Result<void, RefusCreationOperateur>> {
    this.enregistrements.push(commande);
    const resultat = await this.answerEnregistrement(this.creationDifferee ?? Promise.resolve(this.creation));
    if (resultat.ok) {
      this.liste = [...this.liste, this.buildOperateur(new OperateurId('created-operateur'), commande)];
    }
    return resultat;
  }

  override async modifier(commande: CommandeModificationOperateur): Promise<Result<void, RefusModificationOperateur>> {
    this.enregistrements.push(commande);
    const resultat = await this.answerEnregistrement(Promise.resolve(this.modification));
    if (resultat.ok) {
      this.liste = this.liste.map(operateur =>
        operateur.id.value === commande.id.value ? this.buildOperateur(operateur.id, commande) : operateur,
      );
    }
    return resultat;
  }

  override async supprimer(id: OperateurId): Promise<Result<void, RefusSuppressionOperateur>> {
    this.suppressions.push(id);
    if (this.ecritureFailure !== undefined) return Promise.reject(this.ecritureFailure);
    const resultat = await (this.suppressionDifferee ?? Promise.resolve(this.suppression));
    if (resultat.ok) {
      this.liste = this.liste.filter(operateur => operateur.id.value !== id.value);
    }
    return resultat;
  }

  private buildOperateur(id: OperateurId, commande: CommandeCreationOperateur | CommandeModificationOperateur): Operateur {
    const postes = resoudre(this.catalogue, commande.postes);
    return new Operateur(id, {
      nom: commande.nom,
      prenom: commande.prenom,
      matricule: commande.matricule,
      tauxHoraire: commande.tauxHoraire,
      postes,
      natures: naturesDe(postes),
    });
  }

  private answerEnregistrement<Refus>(resultat: Promise<Result<void, Refus>>): Promise<Result<void, Refus>> {
    if (this.ecritureFailure !== undefined) return Promise.reject(this.ecritureFailure);
    return resultat;
  }
}
