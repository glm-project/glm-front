import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { Page } from '@/app/shared/pagination/domain/Page';
import { ok, Result } from '@/app/shared/result/domain/Result';
import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, ParamMap, Params, Router } from '@angular/router';
import { DeferredFixture } from '@test/unit/fixtures/DeferredFixture';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { ActesDAtelierFixture } from '@test/unit/fixtures/gestion/element-de-fabrication/ActesDAtelierFixture';
import { CategoriesDeProduitFixture } from '@test/unit/fixtures/gestion/element-de-fabrication/CategoriesDeProduitFixture';
import { ElementsDeFabricationFixture } from '@test/unit/fixtures/gestion/element-de-fabrication/ElementsDeFabricationFixture';
import { dataSelector } from '@test/utils/DataSelector';
import { requiredFixture } from '@test/utils/RequiredFixture';
import { BehaviorSubject, EMPTY, firstValueFrom } from 'rxjs';
import { ActesDAtelierPort } from '../../../domain/ActesDAtelierPort';
import { CategorieDeProduit } from '../../../domain/CategorieDeProduit';
import { CategoriesDeProduitPort } from '../../../domain/CategoriesDeProduitPort';
import { CycleDuProduit } from '../../../domain/CycleDuProduit';
import { ElementDeFabrication } from '../../../domain/ElementDeFabrication';
import { ElementDeFabricationId } from '../../../domain/ElementDeFabricationId';
import { ElementsDeFabricationPort } from '../../../domain/ElementsDeFabricationPort';
import { LibelleDElement } from '../../../domain/LibelleDElement';
import { NomDElement } from '../../../domain/NomDElement';
import { PassageALAtelier, ProduitDansSonCycle } from '../../../domain/ProduitDansSonCycle';
import { ReferenceDElement } from '../../../domain/ReferenceDElement';
import { RefusDActeDAtelier } from '../../../domain/RefusDActeDAtelier';
import { SuiviDuProduitId } from '../../../domain/SuiviDuProduitId';
import { Produits } from './Produits';

const CREE_LE = new Date('2026-10-01T11:00:00Z');
const MIS_A_L_ATELIER_LE = new Date('2026-10-02T12:00:00Z');
const CLOTURE_LE = new Date('2026-10-05T19:30:00Z');

const elementFixture = (id: string, categorie: string, nom: string, reference?: string, libelle?: string): ElementDeFabrication =>
  new ElementDeFabrication(new ElementDeFabricationId(id), {
    categorie: new CategorieDeProduit(categorie),
    nom: new NomDElement(nom),
    reference: reference === undefined ? undefined : new ReferenceDElement(reference),
    libelle: libelle === undefined ? undefined : new LibelleDElement(libelle),
  });

const produitFixture = (element: ElementDeFabrication, passage: PassageALAtelier): ProduitDansSonCycle =>
  new ProduitDansSonCycle(element, CREE_LE, passage);

const moulePrepareFixture = produitFixture(elementFixture('moule-1', 'MOULE', 'MOULE-2026-000001', '1015', 'Moule de capot'), {
  cycle: 'EN_PREPARATION',
});
const ofPrepareFixture = produitFixture(elementFixture('of-1', 'OF', 'OF-2026-000042'), { cycle: 'EN_PREPARATION' });
const mouleEnCoursFixture = produitFixture(elementFixture('moule-2', 'MOULE', 'MOULE-2026-000002', 'M-2'), {
  cycle: 'EN_ATELIER',
  suivi: new SuiviDuProduitId('suivi-moule-2'),
  etat: 'EN_COURS',
  misALAtelierLe: MIS_A_L_ATELIER_LE,
});
const ofInterrompuFixture = produitFixture(elementFixture('of-2', 'OF', 'OF-2026-000043'), {
  cycle: 'EN_ATELIER',
  suivi: new SuiviDuProduitId('suivi-of-2'),
  etat: 'INTERROMPU',
  misALAtelierLe: MIS_A_L_ATELIER_LE,
});
const mouleClotureFixture = produitFixture(elementFixture('moule-3', 'MOULE', 'MOULE-2026-000003', 'M-3'), {
  cycle: 'CLOTURE',
  suivi: new SuiviDuProduitId('suivi-moule-3'),
  misALAtelierLe: MIS_A_L_ATELIER_LE,
  clotureLe: CLOTURE_LE,
  clotureePar: 'Claire',
});

class RouteFixture {
  readonly queryParamMap: BehaviorSubject<ParamMap>;

  constructor(parametres: Params) {
    this.queryParamMap = new BehaviorSubject<ParamMap>(convertToParamMap(parametres));
  }
}

interface UrlTreeFixture {
  readonly commands: readonly unknown[];
  readonly queryParams: Params;
}

class RouterFixture {
  readonly navigations: { readonly queryParams: Params; readonly replaceUrl: boolean }[] = [];
  readonly events = EMPTY;
  route: RouteFixture | undefined;

  createUrlTree(commands: readonly unknown[], extras?: { queryParams?: Params | null }): UrlTreeFixture {
    return { commands, queryParams: extras?.queryParams ?? {} };
  }

  serializeUrl(arbre: UrlTreeFixture): string {
    const requete = new URLSearchParams(arbre.queryParams).toString();
    const chemin = arbre.commands.map(String).join('/');
    return requete === '' ? chemin : `${chemin}?${requete}`;
  }

  navigate(_commands: unknown[], extras: { queryParams: Params; replaceUrl: boolean }): Promise<boolean> {
    this.navigations.push({ queryParams: extras.queryParams, replaceUrl: extras.replaceUrl });
    this.route?.queryParamMap.next(convertToParamMap(extras.queryParams));
    return Promise.resolve(true);
  }
}

const creeFixture = produitFixture(elementFixture('piece-1', 'PIECE', 'PIECE-2026-000001'), { cycle: 'EN_PREPARATION' });

describe('Produits page', () => {
  let fixture: ComponentFixture<Produits>;
  let port: ElementsDeFabricationFixture;
  let categories: CategoriesDeProduitFixture;
  let router: RouterFixture;
  let adresse: Params;
  let actes: ActesDAtelierFixture;
  let errors: ErrorHandlerFixture;
  beforeEach(() => {
    actes = new ActesDAtelierFixture();
    errors = new ErrorHandlerFixture();
    port = new ElementsDeFabricationFixture();
    categories = new CategoriesDeProduitFixture();
    router = new RouterFixture();
    adresse = {};
    givenCategories(['MOULE', 'OF']);
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useFactory: () => (router.route = new RouteFixture(adresse)) },
        { provide: ComponentFixtureAutoDetect, useValue: true },
        { provide: ElementsDeFabricationPort, useValue: port },
        { provide: CategoriesDeProduitPort, useValue: categories },
        { provide: ActesDAtelierPort, useValue: actes },
        { provide: ErrorHandlerPort, useValue: errors },
      ],
    });
  });
  afterEach(async () => {
    const dialogs = TestBed.inject(MatDialog);
    const closed = firstValueFrom(dialogs.afterAllClosed);
    dialogs.closeAll();
    await closed;
  });

  it('should open on the products in the workshop, whatever their state', async () => {
    givenProducts();

    await whenOpening();

    expect(pressedCycle()).toBe('En atelier');
    expect(lastRequest()).toEqual({ cycle: 'EN_ATELIER', categorie: undefined, recherche: '', page: 0 });
    expect(texts('element-nom-cell')).toEqual(['MOULE-2026-000002', 'OF-2026-000043']);
  });

  it('should open the tab, the category, the search and the page its address carries', async () => {
    givenProducts();
    givenAddress({ etat: 'clotures', categorie: 'MOULE', recherche: 'capot', page: '2' });

    await whenOpening();

    expect(pressedCycle()).toBe('Clôturés');
    expect(lastRequest()).toEqual({ cycle: 'CLOTURE', categorie: 'MOULE', recherche: 'capot', page: 1 });
    expect(searchValue()).toBe('capot');
  });

  it('should write the chosen tab into the address, from its first page', async () => {
    givenManyProductsInTheWorkshop(21);
    await whenOpening();
    await whenClicking('elements-page-suivante');

    await whenChoosingCycle('CLOTURE');

    expect(router.navigations).toEqual([
      { queryParams: { etat: 'en-atelier', page: 2 }, replaceUrl: false },
      { queryParams: { etat: 'clotures' }, replaceUrl: false },
    ]);
  });

  it('should keep the history clean while the search is typed', async () => {
    await whenOpening();

    await whenSearching('capot');

    expect(router.navigations).toEqual([{ queryParams: { etat: 'en-atelier', recherche: 'capot' }, replaceUrl: true }]);
  });

  it('should reread the products in preparation after a creation made from their tab', async () => {
    givenAddress({ etat: 'en-preparation' });
    await whenOpening();
    await whenClicking('elements-new');
    port.produitsEnregistres = [creeFixture];

    await whenClosingDialog(creeFixture.element.id);

    expect(router.navigations).toEqual([]);
    expect(texts('element-nom-cell')).toEqual(['PIECE-2026-000001']);
  });

  it('should offer the three cycles in the order of a product life', async () => {
    await whenOpening();

    expect(texts('elements-cycle-libelle')).toEqual(['En préparation', 'En atelier', 'Clôturés']);
  });

  it('should count the products of each cycle on its tab', async () => {
    givenProducts();

    await whenOpening();

    expect(counters()).toEqual(['2', '2', '1']);
  });

  it('should count the products matching the search on each tab', async () => {
    givenProducts();
    await whenOpening();

    await whenSearching('capot');

    expect(requiredFixture(port.requetesDeCompteurs.at(-1), 'compteurs').recherche).toBe('capot');
    expect(counters()).toEqual(['1', '0', '0']);
  });

  it.each([
    ['EN_PREPARATION', ['Catégorie', 'Nom', 'Référence', 'Libellé', 'Créé le', 'Actions']],
    ['EN_ATELIER', ['Catégorie', 'Nom', 'Référence', 'État', 'Mis à l’atelier le', 'Actions']],
    ['CLOTURE', ['Catégorie', 'Nom', 'Référence', 'Mis à l’atelier le', 'Clôturé le', 'Actions']],
  ] as const)('should show the columns of the %s cycle', async (cycle, colonnes) => {
    givenProducts();
    await whenOpening();

    await whenChoosingCycle(cycle);

    expect(headers()).toEqual(colonnes);
  });

  it('should read a chosen cycle from its first page', async () => {
    givenManyProductsInTheWorkshop(21);
    await whenOpening();
    await whenClicking('elements-page-suivante');

    await whenChoosingCycle('CLOTURE');

    expect(lastRequest()).toEqual({ cycle: 'CLOTURE', categorie: undefined, recherche: '', page: 0 });
  });

  it('should name a product in preparation by its category, numbers, label and creation', async () => {
    givenProducts();
    await whenOpening();

    await whenChoosingCycle('EN_PREPARATION');

    expect(texts('element-categorie-cell')).toEqual(['MOULE', 'OF']);
    expect(texts('element-nom-cell')).toEqual(['MOULE-2026-000001', 'OF-2026-000042']);
    expect(texts('element-reference-cell')).toEqual(['1015', '—']);
    expect(texts('element-libelle-cell')).toEqual(['Moule de capot', '—']);
    expect(texts('element-cree-le-cell')).toEqual(['01/10/2026 08:00', '01/10/2026 08:00']);
  });

  it('should tell where a product in the workshop stands and since when', async () => {
    givenProducts();

    await whenOpening();

    expect(texts('element-etat-cell')).toEqual(['En cours', 'Interrompu']);
    expect(texts('element-mis-a-l-atelier-le-cell')).toEqual(['02/10/2026 09:00', '02/10/2026 09:00']);
  });

  it('should tell when and by whom a closed product was closed', async () => {
    givenProducts();
    await whenOpening();

    await whenChoosingCycle('CLOTURE');

    expect(texts('element-mis-a-l-atelier-le-cell')).toEqual(['02/10/2026 09:00']);
    expect(texts('element-cloture-le')).toEqual(['05/10/2026 16:30']);
    expect(texts('element-cloturee-par')).toEqual(['par Claire']);
  });

  it('should offer to put a product in preparation into the workshop', async () => {
    givenProducts();
    await whenOpening();

    await whenChoosingCycle('EN_PREPARATION');

    expect(labels('element-mise-a-l-atelier')).toEqual(['Mettre 1015 à l’atelier', 'Mettre OF-2026-000042 à l’atelier']);
    expect(hrefs('element-cout-de-revient')).toEqual([]);
  });

  it('should put a product into the workshop from its row and stay on the products in preparation', async () => {
    givenProducts();
    givenWorkshopAccepts('moule-1');
    givenAddress({ etat: 'en-preparation' });
    await whenOpening();

    await whenClickingFirst('element-mise-a-l-atelier');

    expect(actes.miseALAtelier).toEqual(['moule-1']);
    expect(pressedCycle()).toBe('En préparation');
    expect(texts('element-nom-cell')).toEqual(['OF-2026-000042']);
    expect(counters()).toEqual(['1', '3', '1']);
  });

  it('should tell why the workshop refused a product', async () => {
    givenProducts();
    givenAddress({ etat: 'en-preparation' });
    await whenOpening();

    await whenClickingFirst('element-mise-a-l-atelier');

    expect(text('elements-action-refus')).toBe('Ce produit n’existe plus. Actualisez la liste.');
  });

  it('should report a technical failure of the workshop and keep the products', async () => {
    givenProducts();
    givenWorkshopFails();
    givenAddress({ etat: 'en-preparation' });
    await whenOpening();

    await whenClickingFirst('element-mise-a-l-atelier');

    expect(text('elements-action-erreur')).toBe('L’action a échoué. Vérifiez la connexion puis réessayez.');
    expect(errors.errors).toEqual([new Error('Network down')]);
    expect(texts('element-nom-cell')).toEqual(['MOULE-2026-000001', 'OF-2026-000042']);
  });

  it('should forget the previous refusal when a new act starts', async () => {
    givenProducts();
    givenAddress({ etat: 'en-preparation' });
    await whenOpening();
    await whenClickingFirst('element-mise-a-l-atelier');
    givenWorkshopAccepts('moule-1');

    await whenClickingFirst('element-mise-a-l-atelier');

    expect(text('elements-action-refus')).toBe('');
  });

  it('should not put the same product twice into the workshop while the first act is pending', async () => {
    givenProducts();
    const pending = new DeferredFixture<Result<void, RefusDActeDAtelier>>();
    givenWorkshopIsPending(pending);
    givenAddress({ etat: 'en-preparation' });
    await whenOpening();
    await whenClickingFirst('element-mise-a-l-atelier');
    const busy = button('element-mise-a-l-atelier').disabled;
    pending.resolve(ok(undefined));
    await whenViewSettles();

    expect(busy).toBe(true);
    expect(button('element-mise-a-l-atelier').disabled).toBe(false);
  });

  it.each(['EN_ATELIER', 'CLOTURE'] as const)(
    'should offer the cost of manufacture of a product %s, and no workshop entry',
    async cycle => {
      givenProducts();
      await whenOpening();

      await whenChoosingCycle(cycle);

      expect(hrefs('element-cout-de-revient')[0]).toMatch(/^\/couts-de-revient\/moule-[23]$/);
      expect(labels('element-mise-a-l-atelier')).toEqual([]);
    },
  );

  it('should offer to close each product in the workshop', async () => {
    givenProducts();

    await whenOpening();

    expect(labels('element-cloture')).toEqual(['Clôturer M-2', 'Clôturer OF-2026-000043']);
  });

  it('should ask to confirm the closure of the chosen product', async () => {
    givenProducts();
    await whenOpening();

    await whenClickingFirst('element-cloture');

    expect(text('element-cloture-description')).toContain('M-2 disparaîtra des écrans des opérateurs');
  });

  it('should close a product and stay on the products in the workshop', async () => {
    givenProducts();
    givenWorkshopCloses('moule-2');
    await whenOpening();
    await whenClickingFirst('element-cloture');

    await whenConfirmingClosure();

    expect(actes.clotures).toEqual(['suivi-moule-2']);
    expect(pressedCycle()).toBe('En atelier');
    expect(texts('element-nom-cell')).toEqual(['OF-2026-000043']);
    expect(counters()).toEqual(['2', '1', '2']);
  });

  it('should leave the products in the workshop untouched when the closure is cancelled', async () => {
    givenProducts();
    await whenOpening();
    await whenClickingFirst('element-cloture');
    const lectures = port.requetes.length;

    await whenClosingDialog(false);

    expect(actes.clotures).toEqual([]);
    expect(port.requetes).toHaveLength(lectures);
  });

  it('should offer to reopen each closed product, and only them', async () => {
    givenProducts();
    await whenOpening();
    const enAtelier = labels('element-reouverture');

    await whenChoosingCycle('CLOTURE');

    expect(enAtelier).toEqual([]);
    expect(labels('element-reouverture')).toEqual(['Rouvrir M-3']);
    expect(labels('element-cloture')).toEqual([]);
  });

  it('should reopen a product without confirmation and stay on the closed products', async () => {
    givenProducts();
    givenWorkshopReopens('moule-3');
    givenAddress({ etat: 'clotures' });
    await whenOpening();

    await whenClickingFirst('element-reouverture');

    expect(actes.reouvertures).toEqual(['suivi-moule-3']);
    expect(pressedCycle()).toBe('Clôturés');
    expect(text('elements-empty')).toBe('Aucun produit clôturé.');
    expect(counters()).toEqual(['2', '3', '0']);
  });

  it('should tell why a product could not be reopened', async () => {
    givenProducts();
    givenAddress({ etat: 'clotures' });
    await whenOpening();

    await whenClickingFirst('element-reouverture');

    expect(text('elements-action-refus')).toBe('Ce produit n’est plus à l’atelier. Actualisez la liste.');
  });

  it('should announce where a product put into the workshop went', async () => {
    givenProducts();
    givenWorkshopAccepts('moule-1');
    givenAddress({ etat: 'en-preparation' });
    await whenOpening();

    await whenClickingFirst('element-mise-a-l-atelier');

    expect(text('elements-notification-texte')).toBe('1015 mis à l’atelier');
    expect(text('elements-notification-voir')).toBe('Voir');
  });

  it('should show the product put into the workshop on its new tab', async () => {
    givenProducts();
    givenWorkshopAccepts('moule-1');
    givenAddress({ etat: 'en-preparation' });
    await whenOpening();
    await whenClickingFirst('element-mise-a-l-atelier');

    await whenClicking('elements-notification-voir');

    expect(router.navigations.at(-1)?.queryParams).toEqual({ etat: 'en-atelier' });
    expect(highlightedRows()).toEqual(['MOULE-2026-000001']);
    expect(text('elements-notification')).toBe('');
  });

  it('should show a closed product among the closed ones', async () => {
    givenProducts();
    givenWorkshopCloses('moule-2');
    await whenOpening();
    await whenClickingFirst('element-cloture');
    await whenConfirmingClosure();
    const annonce = text('elements-notification-texte');

    await whenClicking('elements-notification-voir');

    expect(annonce).toBe('M-2 clôturé');
    expect(pressedCycle()).toBe('Clôturés');
    expect(highlightedRows()).toEqual(['MOULE-2026-000002']);
  });

  it('should show a reopened product back in the workshop', async () => {
    givenProducts();
    givenWorkshopReopens('moule-3');
    givenAddress({ etat: 'clotures' });
    await whenOpening();
    await whenClickingFirst('element-reouverture');
    const annonce = text('elements-notification-texte');

    await whenClicking('elements-notification-voir');

    expect(annonce).toBe('M-3 rouvert');
    expect(pressedCycle()).toBe('En atelier');
    expect(highlightedRows()).toEqual(['MOULE-2026-000003']);
  });

  it('should dismiss the announcement', async () => {
    givenProducts();
    givenWorkshopAccepts('moule-1');
    givenAddress({ etat: 'en-preparation' });
    await whenOpening();
    await whenClickingFirst('element-mise-a-l-atelier');

    await whenClicking('elements-notification-fermer');

    expect(text('elements-notification')).toBe('');
  });

  it('should stop highlighting a product once another view is chosen', async () => {
    givenProducts();
    givenWorkshopAccepts('moule-1');
    givenAddress({ etat: 'en-preparation' });
    await whenOpening();
    await whenClickingFirst('element-mise-a-l-atelier');
    await whenClicking('elements-notification-voir');

    await whenClicking('elements-categorie-MOULE');

    expect(highlightedRows()).toEqual([]);
  });

  it('should name the cost link by the product it opens', async () => {
    givenProducts();

    await whenOpening();

    expect(labels('element-cout-de-revient')).toEqual(['Voir le coût de revient de M-2', 'Voir le coût de revient de OF-2026-000043']);
  });

  it('should never offer to delete a product', async () => {
    givenProducts();

    await whenOpening();

    expect(actionsOfFirstRow()).toEqual(['Voir le coût de revient de M-2', 'Clôturer M-2', 'Modifier M-2']);
  });

  it('should send the search to the server and read its first page', async () => {
    givenManyProductsInTheWorkshop(21);
    await whenOpening();
    await whenClicking('elements-page-suivante');

    await whenSearching('capot');

    expect(lastRequest()).toEqual({ cycle: 'EN_ATELIER', categorie: undefined, recherche: 'capot', page: 0 });
  });

  it.each([
    ['elements-categorie-OF', 'OF'],
    ['elements-categorie-tous', undefined],
  ])('should send the category chosen by %s to the server', async (selector, categorie) => {
    givenProducts();
    await whenOpening();
    await whenClicking('elements-categorie-MOULE');

    await whenClicking(selector);

    expect(lastRequest().categorie).toBe(categorie);
  });

  it.each([
    ['EN_PREPARATION', 'Aucun produit en préparation. Créez-en un avec « Nouveau produit ».'],
    ['EN_ATELIER', 'Rien à l’atelier pour l’instant.'],
    ['CLOTURE', 'Aucun produit clôturé.'],
  ] as const)('should say that the %s cycle is empty', async (cycle, message) => {
    await whenOpening();

    await whenChoosingCycle(cycle);

    expect(text('elements-empty')).toBe(message);
  });

  it('should say that nothing matches a search', async () => {
    givenProducts();
    await whenOpening();

    await whenSearching('introuvable');

    expect(text('elements-empty')).toBe('Aucun produit ne correspond à cette recherche.');
  });

  it('should offer no page buttons while the workshop fits on one page', async () => {
    givenManyProductsInTheWorkshop(20);

    await whenOpening();

    expect(text('elements-pagination')).toBe('');
  });

  it('should read the next page of the workshop from the server', async () => {
    givenManyProductsInTheWorkshop(21);
    await whenOpening();
    const premiere = text('elements-pagination-intervalle');
    const precedenteDesactivee = button('elements-page-precedente').disabled;

    await whenClicking('elements-page-suivante');

    expect(premiere).toBe('1–20 sur 21');
    expect(precedenteDesactivee).toBe(true);
    expect(text('elements-pagination-intervalle')).toBe('21–21 sur 21');
    expect(button('elements-page-suivante').disabled).toBe(true);
    expect(texts('element-nom-cell')).toEqual(['PRD-2026-000021']);
  });

  it('should come back to the previous page', async () => {
    givenManyProductsInTheWorkshop(21);
    await whenOpening();
    await whenClicking('elements-page-suivante');

    await whenClicking('elements-page-precedente');

    expect(lastRequest().page).toBe(0);
    expect(text('elements-pagination-intervalle')).toBe('1–20 sur 21');
  });

  it('should always situate the closed products in their pages', async () => {
    givenProducts();
    await whenOpening();

    await whenChoosingCycle('CLOTURE');

    expect(text('elements-pagination-intervalle')).toBe('1–1 sur 1');
  });

  it('should keep the most recently requested products when an older response arrives last', async () => {
    givenProducts();
    await whenOpening();
    const old = new DeferredFixture<Page<ProduitDansSonCycle>>();
    givenReadingIsPending(old);
    const arrival = port.signalLecture();
    whenRefreshing();
    await arrival;
    givenReadingSucceeds();
    await whenChoosingCycle('CLOTURE');
    old.resolve(new Page([ofPrepareFixture], 1));
    await whenViewSettles();

    expect(texts('element-nom-cell')).toEqual(['MOULE-2026-000003']);
  });

  it('should keep loading the current products when an obsolete read fails', async () => {
    await whenOpening();
    const old = new DeferredFixture<Page<ProduitDansSonCycle>>();
    givenReadingIsPending(old);
    const firstArrival = port.signalLecture();
    whenRefreshing();
    await firstArrival;
    const current = new DeferredFixture<Page<ProduitDansSonCycle>>();
    givenReadingIsPending(current);
    const secondArrival = port.signalLecture();
    whenRefreshing();
    await secondArrival;
    old.reject(new Error('Obsolete read failed'));
    await whenViewSettles();
    const loading = text('elements-loading');
    const failure = text('elements-error');
    current.resolve(new Page([mouleEnCoursFixture], 1));
    await whenViewSettles();

    expect(loading).toContain('Chargement des produits');
    expect(failure).toBe('');
    expect(texts('element-nom-cell')).toEqual(['MOULE-2026-000002']);
  });

  it('should show loading without displaying the empty state prematurely', async () => {
    const deferred = new DeferredFixture<Page<ProduitDansSonCycle>>();
    givenReadingIsPending(deferred);
    await whenOpening();
    const loading = text('elements-loading');
    const empty = text('elements-empty');
    deferred.resolve(new Page([], 0));
    await whenViewSettles();

    expect(loading).toContain('Chargement des produits');
    expect(empty).toBe('');
  });

  it('should allow retry after an acquisition failure', async () => {
    givenReadingFails('Network down');
    await whenOpening();
    const failure = text('elements-error');
    givenReadingSucceeds();
    givenProducts();

    await whenClicking('elements-retry');

    expect(failure).toContain('Impossible de charger les produits');
    expect(texts('element-row')).toHaveLength(2);
  });

  it('should invite to declare a category, and offer no creation, while the company has declared none', async () => {
    givenCategories([]);

    await whenOpening();

    expect(text('elements-sans-categorie')).toContain('Aucune catégorie de produit');
    expect(creation()).toBeNull();
  });

  it.each(['elements-categories', 'elements-sans-categorie-declarer'])('should open the category management from %s', async selector => {
    givenCategories([]);
    await whenOpening();

    await whenClicking(selector);

    expect(text('categories-title')).toBe('Catégories de produit');
  });

  it('should offer the creation in a category declared from the management once it is closed', async () => {
    givenCategories(['MOULE']);
    await whenOpening();
    await whenClicking('elements-categories');
    givenCategories(['MOULE', 'PIECE']);
    await whenClosingDialog(true);

    await whenClicking('elements-new');

    expect(categoriesOffered()).toEqual(['— Choisir —', 'MOULE', 'PIECE']);
  });

  it('should offer the categories, as filters and in the creation form, in the order the company chose', async () => {
    givenCategories(['PIECE', 'OF', 'MOULE']);
    await whenOpening();

    await whenClicking('elements-new');

    expect(buttonsIn('elements-filtres')).toEqual(['Tous', 'PIECE', 'OF', 'MOULE']);
    expect(categoriesOffered()).toEqual(['— Choisir —', 'PIECE', 'OF', 'MOULE']);
  });

  it('should choose the only category of the company in the creation form', async () => {
    givenCategories(['MOULE']);
    await whenOpening();

    await whenClicking('elements-new');

    expect(categoryChosen()).toBe('MOULE');
  });

  it.each([
    ['elements-categorie-OF', 'OF'],
    ['elements-categorie-tous', ''],
  ])('should prefill the creation form category from the %s filter', async (filtre, expected) => {
    await whenOpening();
    await whenClicking(filtre);

    await whenClicking('elements-new');

    expect(categoryChosen()).toBe(expected);
  });

  it('should open the creation form without the produced number', async () => {
    await whenOpening();

    await whenClicking('elements-new');

    expect(text('element-form-title')).toBe('Nouveau produit');
    expect(fields()).toEqual(['element-reference', 'element-libelle']);
  });

  it('should show and highlight a created product among the products in preparation', async () => {
    givenProducts();
    await whenOpening();
    await whenClicking('elements-new');
    port.produitsEnregistres = [creeFixture, ...port.produitsEnregistres];

    await whenClosingDialog(creeFixture.element.id);

    expect(pressedCycle()).toBe('En préparation');
    expect(lastRequest()).toEqual({ cycle: 'EN_PREPARATION', categorie: undefined, recherche: '', page: 0 });
    expect(texts('element-nom-cell')).toEqual(['PIECE-2026-000001', 'MOULE-2026-000001', 'OF-2026-000042']);
    expect(highlightedRows()).toEqual(['PIECE-2026-000001']);
  });

  it('should stay on the current cycle when creation is cancelled', async () => {
    givenProducts();
    await whenOpening();
    await whenClicking('elements-new');

    await whenClosingDialog(false);

    expect(pressedCycle()).toBe('En atelier');
  });

  it('should open the modification form on the selected product and reread its cycle after saving', async () => {
    givenProducts();
    await whenOpening();
    await whenClickingFirst('element-edit');
    const titre = text('element-form-title');
    port.produitsEnregistres = [
      produitFixture(elementFixture('moule-2', 'MOULE', 'MOULE-2026-000002', 'M-20'), mouleEnCoursFixture.passage),
    ];

    await whenClosingDialog(new ElementDeFabricationId('moule-2'));

    expect(titre).toBe('Modifier M-2');
    expect(pressedCycle()).toBe('En atelier');
    expect(texts('element-reference-cell')).toEqual(['M-20']);
  });

  const givenCategories = (codes: readonly string[]): void => {
    categories.liste = codes.map(code => new CategorieDeProduit(code));
  };
  const givenWorkshopAccepts = (element: string): void => {
    actes.existants = [element];
    actes.apresMiseALAtelier = () => {
      port.produitsEnregistres = port.produitsEnregistres.map(produit =>
        produit.element.id.value === element
          ? produitFixture(produit.element, {
              cycle: 'EN_ATELIER',
              suivi: new SuiviDuProduitId(`suivi-${element}`),
              etat: 'EN_ATTENTE',
              misALAtelierLe: MIS_A_L_ATELIER_LE,
            })
          : produit,
      );
    };
  };
  const givenWorkshopCloses = (element: string): void => {
    actes.suivisOuverts = [`suivi-${element}`];
    actes.apresCloture = () => {
      port.produitsEnregistres = port.produitsEnregistres.map(produit =>
        produit.element.id.value === element
          ? produitFixture(produit.element, {
              cycle: 'CLOTURE',
              suivi: new SuiviDuProduitId(`suivi-${element}`),
              misALAtelierLe: MIS_A_L_ATELIER_LE,
              clotureLe: CLOTURE_LE,
              clotureePar: 'Claire',
            })
          : produit,
      );
    };
  };
  const givenWorkshopReopens = (element: string): void => {
    actes.suivisClotures = [`suivi-${element}`];
    actes.apresReouverture = () => {
      port.produitsEnregistres = port.produitsEnregistres.map(produit =>
        produit.element.id.value === element
          ? produitFixture(produit.element, {
              cycle: 'EN_ATELIER',
              suivi: new SuiviDuProduitId(`suivi-${element}`),
              etat: 'EN_ATTENTE',
              misALAtelierLe: MIS_A_L_ATELIER_LE,
            })
          : produit,
      );
    };
  };
  const givenWorkshopFails = (): void => {
    actes.ecritureFailure = new Error('Network down');
  };
  const givenWorkshopIsPending = (pending: DeferredFixture<Result<void, RefusDActeDAtelier>>): void => {
    actes.miseALAtelierDifferee = pending.promise;
  };
  const givenAddress = (parametres: Params): void => {
    adresse = parametres;
  };
  const givenProducts = (): void => {
    port.produitsEnregistres = [moulePrepareFixture, ofPrepareFixture, mouleEnCoursFixture, ofInterrompuFixture, mouleClotureFixture];
  };
  const givenManyProductsInTheWorkshop = (count: number): void => {
    port.produitsEnregistres = Array.from({ length: count }, (_, index) =>
      produitFixture(elementFixture(String(index + 1), 'MOULE', `PRD-2026-${String(index + 1).padStart(6, '0')}`), {
        cycle: 'EN_ATELIER',
        suivi: new SuiviDuProduitId(`suivi-${String(index + 1)}`),
        etat: 'EN_ATTENTE',
        misALAtelierLe: MIS_A_L_ATELIER_LE,
      }),
    );
  };
  const givenReadingIsPending = (deferred: DeferredFixture<Page<ProduitDansSonCycle>>): void => {
    port.lectureDifferee = deferred.promise;
  };
  const givenReadingFails = (message: string): void => {
    port.lectureFailure = new Error(message);
  };
  const givenReadingSucceeds = (): void => {
    port.lectureFailure = undefined;
    port.lectureDifferee = undefined;
  };
  const whenOpening = async (): Promise<void> => {
    fixture = TestBed.createComponent(Produits);
    await whenViewSettles();
  };
  const whenViewSettles = async (): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve));
    await fixture.whenStable();
  };
  const whenChoosingCycle = (cycle: CycleDuProduit): Promise<void> => whenClicking(`elements-cycle-${cycle}`);
  const whenClicking = async (selector: string): Promise<void> => {
    requiredFixture(document.querySelector<HTMLButtonElement>(dataSelector(selector)), selector).click();
    await whenViewSettles();
  };
  const whenClickingFirst = async (selector: string): Promise<void> => {
    requiredFixture([...document.querySelectorAll<HTMLButtonElement>(dataSelector(selector))][0], selector).click();
    await whenViewSettles();
  };
  const whenConfirmingClosure = async (): Promise<void> => {
    const dialogs = TestBed.inject(MatDialog);
    const closed = firstValueFrom(dialogs.afterAllClosed);
    requiredFixture(document.querySelector<HTMLButtonElement>(dataSelector('element-cloture-confirm')), 'element-cloture-confirm').click();
    await closed;
    await whenViewSettles();
  };
  const whenClosingDialog = async (result: unknown): Promise<void> => {
    const dialogs = TestBed.inject(MatDialog);
    const closed = firstValueFrom(dialogs.afterAllClosed);
    dialogs.openDialogs[dialogs.openDialogs.length - 1]?.close(result);
    await closed;
    await whenViewSettles();
  };
  const whenSearching = async (query: string): Promise<void> => {
    const input = fixture.debugElement.query(By.css(dataSelector('elements-search'))).nativeElement as HTMLInputElement;
    input.value = query;
    input.dispatchEvent(new Event('input'));
    await whenViewSettles();
  };
  const whenRefreshing = (): void => {
    fixture.debugElement.query(By.css(dataSelector('elements-refresh'))).triggerEventHandler('click');
  };
  const lastRequest = () => {
    const requete = requiredFixture(port.requetes.at(-1), 'requete');
    return { cycle: requete.cycle, categorie: requete.categorie?.value, recherche: requete.recherche, page: requete.page };
  };
  const text = (selector: string): string => document.querySelector(dataSelector(selector))?.textContent.trim() ?? '';
  const texts = (selector: string): string[] =>
    [...document.querySelectorAll(dataSelector(selector))].map(element => element.textContent.replace(/\s+/g, ' ').trim());
  const button = (selector: string): HTMLButtonElement =>
    requiredFixture(document.querySelector<HTMLButtonElement>(dataSelector(selector)), selector);
  const buttonsIn = (selector: string): string[] =>
    Array.from(document.querySelector(dataSelector(selector))?.querySelectorAll('button') ?? [], element => element.textContent.trim());
  const pressedCycle = (): string =>
    document
      .querySelector('[data-selector="elements-cycles"] [aria-pressed="true"] [data-selector="elements-cycle-libelle"]')
      ?.textContent.trim() ?? '';
  const searchValue = (): string =>
    requiredFixture(document.querySelector<HTMLInputElement>(dataSelector('elements-search')), 'elements-search').value;
  const highlightedRows = (): string[] =>
    [...document.querySelectorAll('[data-selector="element-row"][aria-current="true"]')].map(
      row => row.querySelector(dataSelector('element-nom-cell'))?.textContent.trim() ?? '',
    );
  const counters = (): string[] => texts('elements-compteur');
  const headers = (): string[] => [...document.querySelectorAll('th')].map(header => header.textContent.trim());
  const creation = (): Element | null => document.querySelector(dataSelector('elements-new'));
  const categorySelect = (): HTMLSelectElement =>
    requiredFixture(document.querySelector<HTMLSelectElement>(dataSelector('element-categorie')), 'element-categorie');
  const categoriesOffered = (): string[] => [...categorySelect().options].map(option => option.textContent.trim());
  const categoryChosen = (): string => categorySelect().value;
  const fields = (): (string | null)[] =>
    [...document.querySelectorAll('glm-element-form-dialog input')].map(field => field.getAttribute('data-selector'));
  const actionsOfFirstRow = (): (string | null)[] =>
    [...(document.querySelector(dataSelector('element-row'))?.querySelectorAll('button, a') ?? [])].map(action =>
      action.getAttribute('aria-label'),
    );
  const hrefs = (selector: string): string[] =>
    [...document.querySelectorAll(dataSelector(selector))].map(element => element.getAttribute('href') ?? '');
  const labels = (selector: string): (string | null)[] =>
    [...document.querySelectorAll(dataSelector(selector))].map(element => element.getAttribute('aria-label'));
});
