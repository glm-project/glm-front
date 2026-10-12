import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { findApiErrorIn } from '@/app/shared/api-client/infrastructure/secondary/findApiErrorIn';
import { required } from '@/app/shared/api-client/infrastructure/secondary/required';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { Page } from '@/app/shared/pagination/domain/Page';
import { buildPageFrom } from '@/app/shared/pagination/infrastructure/secondary/buildPageFrom';
import { err, ok, Result } from '@/app/shared/result/domain/Result';
import { inject, Injectable } from '@angular/core';
import { CategorieDeProduit } from '../../domain/CategorieDeProduit';
import { CategorieInconnue } from '../../domain/CategorieInconnue';
import { CommandeCreationElement } from '../../domain/CommandeCreationElement';
import { CommandeModificationElement } from '../../domain/CommandeModificationElement';
import { CompteursDesCycles } from '../../domain/CompteursDesCycles';
import { ElementDeFabrication } from '../../domain/ElementDeFabrication';
import { ElementDeFabricationId } from '../../domain/ElementDeFabricationId';
import { ElementDeFabricationIntrouvable } from '../../domain/ElementDeFabricationIntrouvable';
import { ElementsDeFabricationPort } from '../../domain/ElementsDeFabricationPort';
import { LibelleDElement } from '../../domain/LibelleDElement';
import { NomDElement } from '../../domain/NomDElement';
import { PassageALAtelier, ProduitDansSonCycle } from '../../domain/ProduitDansSonCycle';
import { ReferenceDElement } from '../../domain/ReferenceDElement';
import { ReferenceDejaUtilisee } from '../../domain/ReferenceDejaUtilisee';
import { RefusCreationElement } from '../../domain/RefusCreationElement';
import { RefusModificationElement } from '../../domain/RefusModificationElement';
import { RequeteProduits } from '../../domain/RequeteProduits';
import { SuiviDuProduitId } from '../../domain/SuiviDuProduitId';

type RestElement = components['schemas']['RestElementDeFabrication'];

const toReference = (reference: string | undefined): ReferenceDElement | undefined =>
  reference === undefined ? undefined : new ReferenceDElement(reference);

const toLibelle = (description: string | undefined): LibelleDElement | undefined =>
  description === undefined ? undefined : new LibelleDElement(description);

const toElement = (element: RestElement): ElementDeFabrication =>
  new ElementDeFabrication(new ElementDeFabricationId(required(element.id, 'element.id')), {
    categorie: new CategorieDeProduit(required(element.categorie, 'element.categorie')),
    nom: new NomDElement(required(element.nom, 'element.nom')),
    reference: toReference(element.reference),
    libelle: toLibelle(element.description),
  });

const instant = (value: string | undefined, champ: string): Date => new Date(required(value, champ));

const suiviDe = (element: RestElement): SuiviDuProduitId => new SuiviDuProduitId(required(element.suivi, 'element.suivi'));

const toPassage = (element: RestElement): PassageALAtelier => {
  switch (required(element.cycle, 'element.cycle')) {
    case 'EN_PREPARATION':
      return { cycle: 'EN_PREPARATION' };
    case 'EN_ATELIER':
      return {
        cycle: 'EN_ATELIER',
        suivi: suiviDe(element),
        etat: required(element.etatDAtelier, 'element.etatDAtelier'),
        misALAtelierLe: instant(element.misALAtelierLe, 'element.misALAtelierLe'),
      };
    case 'CLOTURE':
      return {
        cycle: 'CLOTURE',
        suivi: suiviDe(element),
        misALAtelierLe: instant(element.misALAtelierLe, 'element.misALAtelierLe'),
        clotureLe: instant(element.clotureLe, 'element.clotureLe'),
        clotureePar: required(element.clotureePar, 'element.clotureePar'),
      };
  }
};

const toProduit = (element: RestElement): ProduitDansSonCycle =>
  new ProduitDansSonCycle(toElement(element), instant(element.dateDeCreation, 'element.dateDeCreation'), toPassage(element));

const filtresDe = (requete: RequeteProduits): { categorie?: string; recherche?: string } => {
  const recherche = requete.rechercheSaisie();
  return {
    ...(requete.categorie === undefined ? {} : { categorie: requete.categorie.value }),
    ...(recherche === undefined ? {} : { recherche }),
  };
};

const toFiche = (
  commande: CommandeCreationElement | CommandeModificationElement,
): components['schemas']['RestModificationElementDeFabrication'] => ({
  ...(commande.reference === undefined ? {} : { reference: commande.reference.value }),
  ...(commande.libelle === undefined ? {} : { description: commande.libelle.value }),
});

const refusCreation = (urn: string | undefined): RefusCreationElement | undefined => {
  switch (urn) {
    case 'urn:glm:erreur:element-de-fabrication:reference-deja-utilisee':
      return new ReferenceDejaUtilisee();
    case 'urn:glm:erreur:element-de-fabrication:categorie-inconnue':
      return new CategorieInconnue();
    default:
      return undefined;
  }
};

const refusModification = (urn: string | undefined): RefusModificationElement | undefined => {
  switch (urn) {
    case 'urn:glm:erreur:element-de-fabrication:reference-deja-utilisee':
      return new ReferenceDejaUtilisee();
    case 'urn:glm:erreur:element-de-fabrication:element-de-fabrication-introuvable':
      return new ElementDeFabricationIntrouvable();
    default:
      return undefined;
  }
};

@Injectable()
export class HttpElementsDeFabrication extends ElementsDeFabricationPort {
  private readonly api = inject(ApiClient);
  private readonly errors = inject(ErrorHandlerPort);

  override async produits(requete: RequeteProduits): Promise<Page<ProduitDansSonCycle>> {
    try {
      const response = await this.api.read('/api/elements-de-fabrication', {
        queryParams: { cycle: requete.cycle, ...filtresDe(requete), page: requete.page, size: requete.taille },
      });
      return buildPageFrom(response, toProduit, requete);
    } catch (failure) {
      this.errors.handleError(failure);
      throw failure;
    }
  }

  override async compteurs(requete: RequeteProduits): Promise<CompteursDesCycles> {
    try {
      const compteurs = await this.api.read('/api/elements-de-fabrication/compteurs', { queryParams: filtresDe(requete) });
      return { EN_PREPARATION: compteurs.enPreparation, EN_ATELIER: compteurs.enAtelier, CLOTURE: compteurs.clotures };
    } catch (failure) {
      this.errors.handleError(failure);
      throw failure;
    }
  }

  override creer(commande: CommandeCreationElement): Promise<Result<void, RefusCreationElement>> {
    return this.execute(
      this.api.write('/api/elements-de-fabrication', { body: { categorie: commande.categorie.value, ...toFiche(commande) } }),
      refusCreation,
    );
  }

  override modifier(commande: CommandeModificationElement): Promise<Result<void, RefusModificationElement>> {
    return this.execute(
      this.api.update('/api/elements-de-fabrication/{id}', { pathParams: { id: commande.id.value }, body: toFiche(commande) }),
      refusModification,
    );
  }

  private async execute<Refus>(
    operation: Promise<unknown>,
    translate: (urn: string | undefined) => Refus | undefined,
  ): Promise<Result<void, Refus>> {
    try {
      await operation;
      return ok(undefined);
    } catch (failure) {
      const refus = translate(findApiErrorIn(failure)?.urn);
      if (refus === undefined) {
        throw failure;
      }
      return err(refus);
    }
  }
}
