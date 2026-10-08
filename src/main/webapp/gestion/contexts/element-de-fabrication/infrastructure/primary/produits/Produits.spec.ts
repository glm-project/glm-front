import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { Page } from '@/app/shared/pagination/domain/Page';
import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { DeferredFixture } from '@test/unit/fixtures/DeferredFixture';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { ElementsDeFabricationFixture } from '@test/unit/fixtures/gestion/element-de-fabrication/ElementsDeFabricationFixture';
import { dataSelector } from '@test/utils/DataSelector';
import { requiredFixture } from '@test/utils/RequiredFixture';
import { firstValueFrom } from 'rxjs';
import { CategorieDeProduit } from '../../../domain/CategorieDeProduit';
import { ElementDeFabrication } from '../../../domain/ElementDeFabrication';
import { ElementDeFabricationId } from '../../../domain/ElementDeFabricationId';
import { ElementsDeFabricationPort } from '../../../domain/ElementsDeFabricationPort';
import { LibelleDElement } from '../../../domain/LibelleDElement';
import { NomDElement } from '../../../domain/NomDElement';
import { ReferenceDElement } from '../../../domain/ReferenceDElement';
import { Produits } from './Produits';

const mouleFixture = new ElementDeFabrication(new ElementDeFabricationId('moule-1'), {
  categorie: new CategorieDeProduit('MOULE'),
  nom: new NomDElement('PRD-2026-000001'),
  reference: new ReferenceDElement('1015'),
  libelle: new LibelleDElement('Moule de capot'),
});
const ofSansReferenceFixture = new ElementDeFabrication(new ElementDeFabricationId('of-1'), {
  categorie: new CategorieDeProduit('OF'),
  nom: new NomDElement('OF-2026-000042'),
  reference: undefined,
  libelle: undefined,
});

describe('Produits page', () => {
  let fixture: ComponentFixture<Produits>;
  let port: ElementsDeFabricationFixture;
  beforeEach(() => {
    port = new ElementsDeFabricationFixture();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ComponentFixtureAutoDetect, useValue: true },
        { provide: ElementsDeFabricationPort, useValue: port },
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

  it.each([
    ['mOuLe', 1],
    ['000042', 1],
    ['introuvable', 0],
  ])('should search the acquired referential for %s and show %s matches', async (query, expected) => {
    givenReferential();
    await whenOpening();

    await whenSearching(query);

    expect(texts('element-row')).toHaveLength(expected);
  });

  it.each([
    ['MOULE', 1],
    ['OF', 1],
    ['tous', 2],
  ])('should filter the catalogue by %s', async (categorie, expected) => {
    givenReferential();
    await whenOpening();

    await whenClicking(`elements-categorie-${categorie}`);

    expect(texts('element-row')).toHaveLength(expected);
  });

  it('should keep loading the current catalogue when an obsolete read fails', async () => {
    givenManyElements(21);
    await whenOpening();
    const old = new DeferredFixture<Page<ElementDeFabrication>>();
    givenReadingIsPending(old);
    const firstArrival = port.signalLecture();
    whenRefreshingCatalogue();
    await firstArrival;
    const current = new DeferredFixture<Page<ElementDeFabrication>>();
    givenReadingIsPending(current);
    const secondArrival = port.signalLecture();
    whenRefreshingCatalogue();
    await secondArrival;
    old.reject(new Error('Obsolete read failed'));
    await whenViewSettles();
    const loading = text('elements-loading');
    const failure = text('elements-error');
    current.resolve(new Page([ofSansReferenceFixture], 1));
    await whenViewSettles();

    expect(loading).toContain('Chargement des moules et OF');
    expect(failure).toBe('');
    expect(texts('element-nom-cell')).toEqual(['OF-2026-000042']);
  });

  it('should keep the most recently requested catalogue when an older response arrives last', async () => {
    givenManyElements(21);
    await whenOpening();
    const old = new DeferredFixture<Page<ElementDeFabrication>>();
    givenReadingIsPending(old);
    const arrival = port.signalLecture();
    whenRefreshingCatalogue();
    await arrival;
    givenReadingSucceeds();
    whenRefreshingCatalogue();
    await whenViewSettles();
    await whenPageSelected(1, 20);
    old.resolve(new Page([mouleFixture], 1));
    await whenViewSettles();

    expect(texts('element-nom-cell')).toEqual(['PRD-2026-000021']);
    expect(text('elements-pagination')).toContain('21–21 sur 21');
  });

  it('should paginate the acquired catalogue without changing its entries', async () => {
    givenManyElements(21);
    await whenOpening();

    await whenPageSelected(1, 20);

    expect(texts('element-nom-cell')).toEqual(['PRD-2026-000021']);
    expect(text('elements-pagination')).toContain('21–21 sur 21');
  });

  it('should show loading without displaying the empty state prematurely', async () => {
    const deferred = new DeferredFixture<Page<ElementDeFabrication>>();
    givenReadingIsPending(deferred);
    await whenOpening();
    const loading = text('elements-loading');
    const empty = text('elements-empty');
    deferred.resolve(new Page([], 0));
    await whenViewSettles();

    expect(loading).toContain('Chargement des moules et OF');
    expect(empty).toBe('');
  });

  it('should offer both creations when the referential is empty', async () => {
    await whenOpening();

    expect(text('elements-empty')).toContain('Aucun moule ni OF');
    expect(text('elements-empty-create-MOULE')).toContain('MOULE');
    expect(text('elements-empty-create-OF')).toContain('OF');
    expect(text('elements-pagination')).toContain('0 élément');
  });

  it('should name each element by its screen words, its numbers and its label', async () => {
    givenReferential();
    await whenOpening();

    expect(texts('element-categorie-cell')).toEqual(['MOULE', 'OF']);
    expect(texts('element-reference-cell')).toEqual(['1015', '—']);
    expect(texts('element-nom-cell')).toEqual(['PRD-2026-000001', 'OF-2026-000042']);
    expect(texts('element-libelle-cell')).toEqual(['Moule de capot', '—']);
  });

  it('should designate an element by its company number, falling back to its produced number', async () => {
    givenReferential();
    await whenOpening();

    expect(editLabels()).toEqual(['Modifier 1015', 'Modifier OF-2026-000042']);
  });

  it('should offer the cost of manufacture of every element, addressed by the element itself', async () => {
    givenReferential();
    await whenOpening();

    expect(hrefs('element-cout-de-revient')).toEqual(['/couts-de-revient/moule-1', '/couts-de-revient/of-1']);
  });

  it('should name the cost link by the element it opens', async () => {
    givenReferential();
    await whenOpening();

    expect(labels('element-cout-de-revient')).toEqual(['Voir le coût de revient de 1015', 'Voir le coût de revient de OF-2026-000042']);
  });

  it('should never offer to delete an element', async () => {
    givenReferential();
    await whenOpening();

    expect(texts('element-row')).toHaveLength(2);
    expect(actionsCount()).toEqual([1, 1]);
  });

  it('should allow retry after an acquisition failure', async () => {
    givenReadingFails('Network down');
    await whenOpening();
    const failure = text('elements-error');
    givenReadingSucceeds();
    givenReferential();

    await whenClicking('elements-retry');

    expect(failure).toContain('Impossible de charger les moules et OF');
    expect(texts('element-row')).toHaveLength(2);
  });

  it.each([
    ['elements-new-MOULE', 'Nouveau produit MOULE'],
    ['elements-new-OF', 'Nouveau produit OF'],
    ['elements-empty-create-MOULE', 'Nouveau produit MOULE'],
    ['elements-empty-create-OF', 'Nouveau produit OF'],
  ])('should open the creation form with the category carried by %s', async (selector, titre) => {
    await whenOpening();
    await whenClicking(selector);

    expect(text('element-form-title')).toBe(titre);
    expect(fields()).toEqual(['element-reference', 'element-libelle']);
  });

  it('should reload the list after a creation succeeds', async () => {
    await whenOpening();
    givenReferential();
    await whenClicking('elements-new-MOULE');
    await whenClosingDialog(true);

    expect(texts('element-reference-cell')).toEqual(['1015', '—']);
  });

  it('should keep the list unchanged when creation is cancelled', async () => {
    givenReferential();
    await whenOpening();
    await whenClicking('elements-new-OF');
    await whenClosingDialog(false);

    expect(texts('element-reference-cell')).toEqual(['1015', '—']);
  });

  it('should open the modification form on the selected element and reload after saving', async () => {
    givenReferential();
    await whenOpening();
    await whenClickingFirst('element-edit');
    const titre = text('element-form-title');
    port.liste = [
      new ElementDeFabrication(mouleFixture.id, {
        categorie: mouleFixture.categorie,
        nom: mouleFixture.nom,
        reference: new ReferenceDElement('1016'),
        libelle: mouleFixture.libelle,
      }),
    ];
    await whenClosingDialog(true);

    expect(titre).toBe('Modifier 1015');
    expect(texts('element-reference-cell')).toEqual(['1016']);
  });

  const givenReferential = (): void => {
    port.liste = [mouleFixture, ofSansReferenceFixture];
  };
  const givenManyElements = (count: number): void => {
    port.liste = Array.from({ length: count }, (_, index) => elementNumerote(index + 1));
  };
  const givenReadingIsPending = (deferred: DeferredFixture<Page<ElementDeFabrication>>): void => {
    port.lectureDifferee = deferred.promise;
  };
  const givenReadingFails = (message: string): void => {
    port.lectureFailure = new Error(message);
  };
  const givenReadingSucceeds = (): void => {
    port.lectureFailure = undefined;
    port.lectureDifferee = undefined;
  };
  const elementNumerote = (numero: number): ElementDeFabrication =>
    new ElementDeFabrication(new ElementDeFabricationId(String(numero)), {
      categorie: new CategorieDeProduit('MOULE'),
      nom: new NomDElement(`PRD-2026-${String(numero).padStart(6, '0')}`),
      reference: undefined,
      libelle: undefined,
    });
  const whenOpening = async (): Promise<void> => {
    fixture = TestBed.createComponent(Produits);
    await fixture.whenStable();
  };

  const whenViewSettles = async (): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve));
    await fixture.whenStable();
  };
  const whenClicking = async (selector: string): Promise<void> => {
    requiredFixture(document.querySelector<HTMLButtonElement>(dataSelector(selector)), selector).click();
    await fixture.whenStable();
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
    await fixture.whenStable();
  };
  const whenSearching = async (query: string): Promise<void> => {
    const input = fixture.debugElement.query(By.css(dataSelector('elements-search'))).nativeElement as HTMLInputElement;
    input.value = query;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };
  const whenRefreshingCatalogue = (): void => {
    fixture.debugElement.query(By.css(dataSelector('elements-refresh'))).triggerEventHandler('click');
  };
  const whenSelectingPage = (pageIndex: number, pageSize: number): void => {
    fixture.debugElement.query(By.css(dataSelector('elements-pagination'))).triggerEventHandler('page', { pageIndex, pageSize });
  };
  const whenPageSelected = async (pageIndex: number, pageSize: number): Promise<void> => {
    whenSelectingPage(pageIndex, pageSize);
    await fixture.whenStable();
  };
  const text = (selector: string): string => document.querySelector(dataSelector(selector))?.textContent.trim() ?? '';
  const texts = (selector: string): string[] =>
    [...document.querySelectorAll(dataSelector(selector))].map(element => element.textContent.trim());
  const fields = (): (string | null)[] =>
    [...document.querySelectorAll('glm-element-form-dialog input')].map(field => field.getAttribute('data-selector'));
  const editLabels = (): (string | null)[] =>
    [...document.querySelectorAll(dataSelector('element-edit'))].map(element => element.getAttribute('aria-label'));
  const actionsCount = (): number[] =>
    [...document.querySelectorAll(dataSelector('element-row'))].map(row => row.querySelectorAll('button').length);
  const hrefs = (selector: string): string[] =>
    [...document.querySelectorAll(dataSelector(selector))].map(element => element.getAttribute('href') ?? '');
  const labels = (selector: string): (string | null)[] =>
    [...document.querySelectorAll(dataSelector(selector))].map(element => element.getAttribute('aria-label'));
});
