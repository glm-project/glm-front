import { Page } from '@/app/shared/pagination/domain/Page';
import { ok, Result } from '@/app/shared/result/domain/Result';
import { CommandeCreationElement } from '@/gestion/contexts/element-de-fabrication/domain/CommandeCreationElement';
import { CommandeModificationElement } from '@/gestion/contexts/element-de-fabrication/domain/CommandeModificationElement';
import { ElementDeFabrication } from '@/gestion/contexts/element-de-fabrication/domain/ElementDeFabrication';
import { ElementDeFabricationId } from '@/gestion/contexts/element-de-fabrication/domain/ElementDeFabricationId';
import { ElementsDeFabricationPort } from '@/gestion/contexts/element-de-fabrication/domain/ElementsDeFabricationPort';
import { NomDElement } from '@/gestion/contexts/element-de-fabrication/domain/NomDElement';
import { ProduitDansSonCycle } from '@/gestion/contexts/element-de-fabrication/domain/ProduitDansSonCycle';
import { RefusCreationElement } from '@/gestion/contexts/element-de-fabrication/domain/RefusCreationElement';
import { RefusModificationElement } from '@/gestion/contexts/element-de-fabrication/domain/RefusModificationElement';
import { RequeteProduits } from '@/gestion/contexts/element-de-fabrication/domain/RequeteProduits';

import { SignalFixture } from '@test/unit/fixtures/SignalFixture';

const NOM_ATTRIBUE = 'PRD-2026-000001';
const CREATION = new Date('2026-10-12T08:00:00Z');

const sansCasse = (texte: string): string => texte.toLocaleLowerCase('fr-FR');

const textesDe = (element: ElementDeFabrication): string[] => [
  element.nom.value,
  element.reference?.value ?? '',
  element.libelle?.value ?? '',
];

const correspond = (produit: ProduitDansSonCycle, requete: RequeteProduits): boolean => {
  const recherche = requete.rechercheSaisie();
  const dansLaCategorie = requete.categorie === undefined || produit.element.categorie.estLaMeme(requete.categorie);
  const trouve = recherche === undefined || textesDe(produit.element).some(texte => sansCasse(texte).includes(sansCasse(recherche)));
  return produit.passage.cycle === requete.cycle && dansLaCategorie && trouve;
};

export class ElementsDeFabricationFixture extends ElementsDeFabricationPort {
  produitsEnregistres: readonly ProduitDansSonCycle[] = [];
  readonly requetes: RequeteProduits[] = [];
  readonly enregistrements: (CommandeCreationElement | CommandeModificationElement)[] = [];
  creation: Result<void, RefusCreationElement> = ok(undefined);
  modification: Result<void, RefusModificationElement> = ok(undefined);
  lectureFailure: Error | undefined;
  ecritureFailure: Error | undefined;
  lectureDifferee: Promise<Page<ProduitDansSonCycle>> | undefined;
  creationDifferee: Promise<Result<void, RefusCreationElement>> | undefined;
  private lectureSignal: SignalFixture | undefined;

  signalLecture(): Promise<void> {
    this.lectureSignal = new SignalFixture();
    return this.lectureSignal.promise;
  }

  override produits(requete: RequeteProduits): Promise<Page<ProduitDansSonCycle>> {
    this.requetes.push(requete);
    this.lectureSignal?.release();
    this.lectureSignal = undefined;
    if (this.lectureFailure !== undefined) return Promise.reject(this.lectureFailure);
    const trouves = this.produitsEnregistres.filter(produit => correspond(produit, requete));
    return (
      this.lectureDifferee
      ?? Promise.resolve(new Page(trouves.slice(requete.page * requete.taille, (requete.page + 1) * requete.taille), trouves.length))
    );
  }

  override async creer(commande: CommandeCreationElement): Promise<Result<void, RefusCreationElement>> {
    this.enregistrements.push(commande);
    const resultat = await this.answerEnregistrement(this.creationDifferee ?? Promise.resolve(this.creation));
    if (resultat.ok) {
      const element = new ElementDeFabrication(new ElementDeFabricationId('created-element'), {
        categorie: commande.categorie,
        nom: new NomDElement(NOM_ATTRIBUE),
        reference: commande.reference,
        libelle: commande.libelle,
      });
      this.produitsEnregistres = [new ProduitDansSonCycle(element, CREATION, { cycle: 'EN_PREPARATION' }), ...this.produitsEnregistres];
    }
    return resultat;
  }

  override async modifier(commande: CommandeModificationElement): Promise<Result<void, RefusModificationElement>> {
    this.enregistrements.push(commande);
    const resultat = await this.answerEnregistrement(Promise.resolve(this.modification));
    if (resultat.ok) {
      this.produitsEnregistres = this.produitsEnregistres.map(produit =>
        produit.element.id.value === commande.id.value ? this.revise(produit, commande) : produit,
      );
    }
    return resultat;
  }

  private revise(produit: ProduitDansSonCycle, commande: CommandeModificationElement): ProduitDansSonCycle {
    const element = new ElementDeFabrication(produit.element.id, {
      categorie: produit.element.categorie,
      nom: produit.element.nom,
      reference: commande.reference,
      libelle: commande.libelle,
    });
    return new ProduitDansSonCycle(element, produit.creeLe, produit.passage);
  }

  private answerEnregistrement<Refus>(resultat: Promise<Result<void, Refus>>): Promise<Result<void, Refus>> {
    if (this.ecritureFailure !== undefined) return Promise.reject(this.ecritureFailure);
    return resultat;
  }
}
