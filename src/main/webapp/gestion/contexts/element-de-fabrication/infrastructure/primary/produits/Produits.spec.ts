import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { Page } from '@/app/shared/pagination/domain/Page';
import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { DeferredFixture } from '@test/unit/fixtures/DeferredFixture';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { CategoriesDeProduitFixture } from '@test/unit/fixtures/gestion/element-de-fabrication/CategoriesDeProduitFixture';
import { ElementsDeFabricationFixture } from '@test/unit/fixtures/gestion/element-de-fabrication/ElementsDeFabricationFixture';
import { dataSelector } from '@test/utils/DataSelector';
import { requiredFixture } from '@test/utils/RequiredFixture';
import { firstValueFrom } from 'rxjs';
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
  etat: 'EN_COURS',
  misALAtelierLe: MIS_A_L_ATELIER_LE,
});
const ofInterrompuFixture = produitFixture(elementFixture('of-2', 'OF', 'OF-2026-000043'), {
  cycle: 'EN_ATELIER',
  etat: 'INTERROMPU',
  misALAtelierLe: MIS_A_L_ATELIER_LE,
});
const mouleClotureFixture = produitFixture(elementFixture('moule-3', 'MOULE', 'MOULE-2026-000003', 'M-3'), {
  cycle: 'CLOTURE',
  misALAtelierLe: MIS_A_L_ATELIER_LE,
  clotureLe: CLOTURE_LE,
  clotureePar: 'Claire',
});

const creeFixture = produitFixture(elementFixture('piece-1', 'PIECE', 'PIECE-2026-000001'), { cycle: 'EN_PREPARATION' });

describe('Produits page', () => {
  let fixture: ComponentFixture<Produits>;
  let port: ElementsDeFabricationFixture;
  let categories: CategoriesDeProduitFixture;
  beforeEach(() => {
    port = new ElementsDeFabricationFixture();
    categories = new CategoriesDeProduitFixture();
    givenCategories(['MOULE', 'OF']);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ComponentFixtureAutoDetect, useValue: true },
        { provide: ElementsDeFabricationPort, useValue: port },
        { provide: CategoriesDeProduitPort, useValue: categories },
        { provide: ErrorHandlerPort, useClass: ErrorHandlerFixture },
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

  it('should offer the three cycles in the order of a product life', async () => {
    await whenOpening();

    expect(buttonsIn('elements-cycles')).toEqual(['En préparation', 'En atelier', 'Clôturés']);
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

    expect(hrefs('element-mise-a-l-atelier')).toEqual(['/atelier?element=moule-1', '/atelier?element=of-1']);
    expect(labels('element-mise-a-l-atelier')).toEqual(['Mettre 1015 à l’atelier', 'Mettre OF-2026-000042 à l’atelier']);
    expect(hrefs('element-cout-de-revient')).toEqual([]);
  });

  it.each(['EN_ATELIER', 'CLOTURE'] as const)(
    'should offer the cost of manufacture of a product %s, and no workshop entry',
    async cycle => {
      givenProducts();
      await whenOpening();

      await whenChoosingCycle(cycle);

      expect(hrefs('element-cout-de-revient')[0]).toMatch(/^\/couts-de-revient\/moule-[23]$/);
      expect(hrefs('element-mise-a-l-atelier')).toEqual([]);
    },
  );

  it('should name the cost link by the product it opens', async () => {
    givenProducts();

    await whenOpening();

    expect(labels('element-cout-de-revient')).toEqual(['Voir le coût de revient de M-2', 'Voir le coût de revient de OF-2026-000043']);
  });

  it('should never offer to delete a product', async () => {
    givenProducts();

    await whenOpening();

    expect(actionsCount()).toEqual([1, 1]);
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

  it('should show a created product among the products in preparation', async () => {
    givenProducts();
    await whenOpening();
    await whenClicking('elements-new');
    port.produitsEnregistres = [creeFixture, ...port.produitsEnregistres];

    await whenClosingDialog(true);

    expect(pressedCycle()).toBe('En préparation');
    expect(lastRequest()).toEqual({ cycle: 'EN_PREPARATION', categorie: undefined, recherche: '', page: 0 });
    expect(texts('element-nom-cell')).toEqual(['PIECE-2026-000001', 'MOULE-2026-000001', 'OF-2026-000042']);
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

    await whenClosingDialog(true);

    expect(titre).toBe('Modifier M-2');
    expect(pressedCycle()).toBe('En atelier');
    expect(texts('element-reference-cell')).toEqual(['M-20']);
  });

  const givenCategories = (codes: readonly string[]): void => {
    categories.liste = codes.map(code => new CategorieDeProduit(code));
  };
  const givenProducts = (): void => {
    port.produitsEnregistres = [moulePrepareFixture, ofPrepareFixture, mouleEnCoursFixture, ofInterrompuFixture, mouleClotureFixture];
  };
  const givenManyProductsInTheWorkshop = (count: number): void => {
    port.produitsEnregistres = Array.from({ length: count }, (_, index) =>
      produitFixture(elementFixture(String(index + 1), 'MOULE', `PRD-2026-${String(index + 1).padStart(6, '0')}`), {
        cycle: 'EN_ATELIER',
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
    await fixture.whenStable();
  };
  const whenClosingDialog = async (result: boolean): Promise<void> => {
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
    document.querySelector('[data-selector="elements-cycles"] [aria-pressed="true"]')?.textContent.trim() ?? '';
  const headers = (): string[] => [...document.querySelectorAll('th')].map(header => header.textContent.trim());
  const creation = (): Element | null => document.querySelector(dataSelector('elements-new'));
  const categorySelect = (): HTMLSelectElement =>
    requiredFixture(document.querySelector<HTMLSelectElement>(dataSelector('element-categorie')), 'element-categorie');
  const categoriesOffered = (): string[] => [...categorySelect().options].map(option => option.textContent.trim());
  const categoryChosen = (): string => categorySelect().value;
  const fields = (): (string | null)[] =>
    [...document.querySelectorAll('glm-element-form-dialog input')].map(field => field.getAttribute('data-selector'));
  const actionsCount = (): number[] =>
    [...document.querySelectorAll(dataSelector('element-row'))].map(row => row.querySelectorAll('button, a').length - 1);
  const hrefs = (selector: string): string[] =>
    [...document.querySelectorAll(dataSelector(selector))].map(element => element.getAttribute('href') ?? '');
  const labels = (selector: string): (string | null)[] =>
    [...document.querySelectorAll(dataSelector(selector))].map(element => element.getAttribute('aria-label'));
});
