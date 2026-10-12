import { Page } from '@/app/shared/pagination/domain/Page';
import { ok, Result } from '@/app/shared/result/domain/Result';
import { CommandeCreationElement } from '@/gestion/contexts/element-de-fabrication/domain/CommandeCreationElement';
import { CommandeModificationElement } from '@/gestion/contexts/element-de-fabrication/domain/CommandeModificationElement';
import { CompteursDesCycles } from '@/gestion/contexts/element-de-fabrication/domain/CompteursDesCycles';
import { ElementDeFabrication } from '@/gestion/contexts/element-de-fabrication/domain/ElementDeFabrication';
import { ElementDeFabricationId } from '@/gestion/contexts/element-de-fabrication/domain/ElementDeFabricationId';
import { ElementsDeFabricationPort } from '@/gestion/contexts/element-de-fabrication/domain/ElementsDeFabricationPort';
import { NomDElement } from '@/gestion/contexts/element-de-fabrication/domain/NomDElement';
import { bornesDeCloture } from '@/gestion/contexts/element-de-fabrication/domain/PeriodeDeCloture';
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

const filtre = (produit: ProduitDansSonCycle, requete: RequeteProduits): boolean => {
  const recherche = requete.rechercheSaisie();
  const dansLaCategorie = requete.categorie === undefined || produit.element.categorie.estLaMeme(requete.categorie);
  const trouve = recherche === undefined || textesDe(produit.element).some(texte => sansCasse(texte).includes(sansCasse(recherche)));
  return dansLaCategorie && trouve;
};

const clotureDansLaPeriode = (produit: ProduitDansSonCycle, requete: RequeteProduits): boolean => {
  if (produit.passage.cycle !== 'CLOTURE') return true;
  const bornes = bornesDeCloture(requete.cloture, new Date());
  return produit.passage.clotureLe >= bornes.debut && produit.passage.clotureLe <= bornes.fin;
};

const correspond = (produit: ProduitDansSonCycle, requete: RequeteProduits): boolean =>
  produit.passage.cycle === requete.cycle && filtre(produit, requete) && clotureDansLaPeriode(produit, requete);

export class ElementsDeFabricationFixture extends ElementsDeFabricationPort {
  produitsEnregistres: readonly ProduitDansSonCycle[] = [];
  readonly requetes: RequeteProduits[] = [];
  readonly requetesDeCompteurs: RequeteProduits[] = [];
  readonly enregistrements: (CommandeCreationElement | CommandeModificationElement)[] = [];
  creation: Result<ElementDeFabricationId, RefusCreationElement> = ok(new ElementDeFabricationId('created-element'));
  modification: Result<void, RefusModificationElement> = ok(undefined);
  lectureFailure: Error | undefined;
  ecritureFailure: Error | undefined;
  lectureDifferee: Promise<Page<ProduitDansSonCycle>> | undefined;
  creationDifferee: Promise<Result<ElementDeFabricationId, RefusCreationElement>> | undefined;
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

  override compteurs(requete: RequeteProduits): Promise<CompteursDesCycles> {
    this.requetesDeCompteurs.push(requete);
    if (this.lectureFailure !== undefined) return Promise.reject(this.lectureFailure);
    const filtres = this.produitsEnregistres.filter(produit => filtre(produit, requete) && clotureDansLaPeriode(produit, requete));
    const compter = (cycle: ProduitDansSonCycle['passage']['cycle']): number =>
      filtres.filter(produit => produit.passage.cycle === cycle).length;
    return Promise.resolve({ EN_PREPARATION: compter('EN_PREPARATION'), EN_ATELIER: compter('EN_ATELIER'), CLOTURE: compter('CLOTURE') });
  }

  override async creer(commande: CommandeCreationElement): Promise<Result<ElementDeFabricationId, RefusCreationElement>> {
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

  private answerEnregistrement<Valeur, Refus>(resultat: Promise<Result<Valeur, Refus>>): Promise<Result<Valeur, Refus>> {
    if (this.ecritureFailure !== undefined) return Promise.reject(this.ecritureFailure);
    return resultat;
  }
}
