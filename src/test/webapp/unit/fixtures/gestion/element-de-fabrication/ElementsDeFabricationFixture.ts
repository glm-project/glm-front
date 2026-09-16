import { Page } from '@/app/shared/pagination/domain/Page';
import { ok, Result } from '@/app/shared/result/domain/Result';
import { CommandeCreationElement } from '@/gestion/contexts/element-de-fabrication/domain/CommandeCreationElement';
import { CommandeModificationElement } from '@/gestion/contexts/element-de-fabrication/domain/CommandeModificationElement';
import { ElementDeFabrication } from '@/gestion/contexts/element-de-fabrication/domain/ElementDeFabrication';
import { ElementDeFabricationId } from '@/gestion/contexts/element-de-fabrication/domain/ElementDeFabricationId';
import { ElementsDeFabricationPort } from '@/gestion/contexts/element-de-fabrication/domain/ElementsDeFabricationPort';
import { NomDElement } from '@/gestion/contexts/element-de-fabrication/domain/NomDElement';
import { ReferenceDejaUtilisee } from '@/gestion/contexts/element-de-fabrication/domain/ReferenceDejaUtilisee';
import { RefusModificationElement } from '@/gestion/contexts/element-de-fabrication/domain/RefusModificationElement';
import { RequeteElements } from '@/gestion/contexts/element-de-fabrication/domain/RequeteElements';

import { SignalFixture } from '@test/unit/fixtures/SignalFixture';

const NOM_ATTRIBUE = 'PRD-2026-000001';

export class ElementsDeFabricationFixture extends ElementsDeFabricationPort {
  liste: readonly ElementDeFabrication[] = [];
  readonly enregistrements: (CommandeCreationElement | CommandeModificationElement)[] = [];
  creation: Result<void, ReferenceDejaUtilisee> = ok(undefined);
  modification: Result<void, RefusModificationElement> = ok(undefined);
  lectureFailure: Error | undefined;
  ecritureFailure: Error | undefined;
  lectureDifferee: Promise<Page<ElementDeFabrication>> | undefined;
  creationDifferee: Promise<Result<void, ReferenceDejaUtilisee>> | undefined;
  private lectureSignal: SignalFixture | undefined;

  signalLecture(): Promise<void> {
    this.lectureSignal = new SignalFixture();
    return this.lectureSignal.promise;
  }

  override elements(requete: RequeteElements): Promise<Page<ElementDeFabrication>> {
    this.lectureSignal?.release();
    this.lectureSignal = undefined;
    if (this.lectureFailure !== undefined) return Promise.reject(this.lectureFailure);
    return (
      this.lectureDifferee
      ?? Promise.resolve(new Page(this.liste.slice(requete.page * requete.taille, (requete.page + 1) * requete.taille), this.liste.length))
    );
  }

  override async creer(commande: CommandeCreationElement): Promise<Result<void, ReferenceDejaUtilisee>> {
    this.enregistrements.push(commande);
    const resultat = await this.answerEnregistrement(this.creationDifferee ?? Promise.resolve(this.creation));
    if (resultat.ok) {
      this.liste = [
        ...this.liste,
        new ElementDeFabrication(new ElementDeFabricationId('created-element'), {
          type: commande.type,
          nom: new NomDElement(NOM_ATTRIBUE),
          reference: commande.reference,
          libelle: commande.libelle,
        }),
      ];
    }
    return resultat;
  }

  override async modifier(commande: CommandeModificationElement): Promise<Result<void, RefusModificationElement>> {
    this.enregistrements.push(commande);
    const resultat = await this.answerEnregistrement(Promise.resolve(this.modification));
    if (resultat.ok) {
      this.liste = this.liste.map(element => (element.id.value === commande.id.value ? this.revise(element, commande) : element));
    }
    return resultat;
  }

  private revise(element: ElementDeFabrication, commande: CommandeModificationElement): ElementDeFabrication {
    return new ElementDeFabrication(element.id, {
      type: element.type,
      nom: element.nom,
      reference: commande.reference,
      libelle: commande.libelle,
    });
  }

  private answerEnregistrement<Refus>(resultat: Promise<Result<void, Refus>>): Promise<Result<void, Refus>> {
    if (this.ecritureFailure !== undefined) return Promise.reject(this.ecritureFailure);
    return resultat;
  }
}
