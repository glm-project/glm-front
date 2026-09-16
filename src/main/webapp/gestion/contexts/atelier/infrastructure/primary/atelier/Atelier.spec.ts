import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { Page } from '@/app/shared/pagination/domain/Page';
import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { DeferredFixture } from '@test/unit/fixtures/DeferredFixture';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { AtelierFixture, AUTEUR_FIXTURE, CLOTURE_FIXTURE, ENGAGEMENT_FIXTURE } from '@test/unit/fixtures/gestion/atelier/AtelierFixture';
import { ElementsEngageablesFixture } from '@test/unit/fixtures/gestion/atelier/ElementsEngageablesFixture';
import { dataSelector } from '@test/utils/DataSelector';
import { requiredFixture } from '@test/utils/RequiredFixture';
import { firstValueFrom } from 'rxjs';
import { ActeDAtelier } from '../../../domain/ActeDAtelier';
import { AtelierPort } from '../../../domain/AtelierPort';
import { DesignationDElement } from '../../../domain/DesignationDElement';
import { ElementALAtelier } from '../../../domain/ElementALAtelier';
import { ElementEngageable } from '../../../domain/ElementEngageable';
import { ElementEngageId } from '../../../domain/ElementEngageId';
import { ElementsEngageablesPort } from '../../../domain/ElementsEngageablesPort';
import { EtatALAtelier } from '../../../domain/EtatALAtelier';
import { InstantDAtelier } from '../../../domain/InstantDAtelier';
import { NomDElementEngage } from '../../../domain/NomDElementEngage';
import { SuiviId } from '../../../domain/SuiviId';
import { SuiviIntrouvable } from '../../../domain/SuiviIntrouvable';
import { TypeDElementEngage } from '../../../domain/TypeDElementEngage';
import { Atelier } from './Atelier';

const engagementFixture = new ActeDAtelier(new InstantDAtelier(ENGAGEMENT_FIXTURE), AUTEUR_FIXTURE);
const clotureFixture = new ActeDAtelier(new InstantDAtelier(CLOTURE_FIXTURE), 'dupont');

const elementFixture = (
  suivi: string,
  nom: string,
  type: TypeDElementEngage,
  etat: EtatALAtelier,
  cloture: ActeDAtelier | undefined,
): ElementALAtelier =>
  new ElementALAtelier(new SuiviId(suivi), {
    nom: new NomDElementEngage(nom),
    type,
    etat,
    engagement: engagementFixture,
    cloture,
  });

const mouleEnCoursFixture = elementFixture('suivi-1', 'PRD-2026-000001', 'PRODUIT', 'EN_COURS', undefined);
const ofEnAttenteFixture = elementFixture('suivi-2', 'OF-2026-000042', 'ORDRE_DE_FABRICATION', 'EN_ATTENTE', undefined);
const mouleClotureFixture = elementFixture('suivi-3', 'PRD-2026-000002', 'PRODUIT', 'CLOTURE', clotureFixture);

describe('Atelier page', () => {
  let fixture: ComponentFixture<Atelier>;
  let port: AtelierFixture;
  let referentiel: ElementsEngageablesFixture;
  let parametres: Record<string, string>;

  beforeEach(() => {
    port = new AtelierFixture();
    referentiel = new ElementsEngageablesFixture();
    parametres = {};
    TestBed.configureTestingModule({
      providers: [
        { provide: ComponentFixtureAutoDetect, useValue: true },
        { provide: AtelierPort, useValue: port },
        { provide: ElementsEngageablesPort, useValue: referentiel },
        { provide: ErrorHandlerPort, useClass: ErrorHandlerFixture },
        { provide: ActivatedRoute, useFactory: () => ({ snapshot: { queryParamMap: convertToParamMap(parametres) } }) },
      ],
    });
  });

  afterEach(async () => {
    const dialogs = TestBed.inject(MatDialog);
    const fermeture = firstValueFrom(dialogs.afterAllClosed);
    dialogs.closeAll();
    await fermeture;
  });

  it('should show loading without displaying the empty state prematurely', async () => {
    const deferred = new DeferredFixture<Page<ElementALAtelier>>();
    givenReadingIsPending(deferred);
    await whenOpening();
    const loading = text('atelier-loading');
    const empty = text('atelier-empty');
    deferred.resolve(new Page([], 0));
    await whenViewSettles();

    expect(loading).toContain('Chargement de l’atelier');
    expect(empty).toBe('');
  });

  it('should invite putting a first element at the workshop when nothing is there', async () => {
    await whenOpening();

    expect(text('atelier-empty')).toContain('Aucun élément à l’atelier');
    expect(text('atelier-empty')).toContain('écrans des opérateurs');
    expect(text('atelier-pagination')).toContain('0 élément');
  });

  it('should name each element by its screen words, its photographed name and its state', async () => {
    givenWorkshop();
    await whenOpening();

    expect(texts('atelier-type-cell')).toEqual(['Moule', 'OF']);
    expect(texts('atelier-nom-cell')).toEqual(['PRD-2026-000001', 'OF-2026-000042']);
    expect(texts('atelier-etat-cell')).toEqual(['En cours', 'En attente']);
  });

  it('should leave the closure column empty while the element is still at the workshop', async () => {
    givenWorkshop();
    await whenOpening();

    expect(texts('atelier-cloture-cell')).toEqual(['—', '—']);
    expect(texts('atelier-engagement-cell')[0]).toContain('par gestionnaire.impeccmold');
  });

  it('should offer closing what is at the workshop, and never offer reopening it', async () => {
    givenWorkshop();
    await whenOpening();

    expect(texts('atelier-close')).toEqual(['Clôturer', 'Clôturer']);
    expect(texts('atelier-reopen')).toEqual([]);
  });

  it('should show closed elements with who closed them, and offer reopening', async () => {
    givenWorkshopWithClosedElement();
    await whenOpening();
    await whenClicking('atelier-filtre-CLOTURES');

    expect(texts('atelier-nom-cell')).toEqual(['PRD-2026-000002']);
    expect(texts('atelier-cloture-cell')[0]).toContain('par dupont');
    expect(texts('atelier-reopen')).toEqual(['Rouvrir']);
    expect(texts('atelier-close')).toEqual([]);
  });

  it('should bring a reopened element back to what is at the workshop', async () => {
    givenWorkshopWithClosedElement();
    await whenOpening();
    await whenClicking('atelier-filtre-CLOTURES');
    await whenClicking('atelier-reopen');

    expect(port.reouvertures.map(suivi => suivi.value)).toEqual(['suivi-3']);
    expect(texts('atelier-nom-cell')).toEqual(['PRD-2026-000001', 'PRD-2026-000002']);
    expect(texts('atelier-close')).toEqual(['Clôturer', 'Clôturer']);
  });

  it('should explain a refusal when the element is no longer tracked', async () => {
    givenWorkshopWithClosedElement();
    await whenOpening();
    await whenClicking('atelier-filtre-CLOTURES');
    givenWorkshopForgotEverything();
    await whenClicking('atelier-reopen');

    expect(text('atelier-action-refusal')).toBe(new SuiviIntrouvable().message);
  });

  it('should report a technical failure raised by reopening', async () => {
    givenWorkshopWithClosedElement();
    await whenOpening();
    await whenClicking('atelier-filtre-CLOTURES');
    givenWritingFails();
    await whenClicking('atelier-reopen');

    expect(text('atelier-action-error')).toContain('Impossible de charger l’atelier');
  });

  it('should allow retry after an acquisition failure', async () => {
    givenReadingFails();
    await whenOpening();
    const failure = text('atelier-error');
    givenReadingSucceeds();
    givenWorkshop();
    await whenClicking('atelier-retry');

    expect(failure).toContain('Impossible de charger l’atelier');
    expect(texts('atelier-row')).toHaveLength(2);
  });

  it.each(['atelier-new', 'atelier-empty-new'])('should open the engagement dialog from %s', async selector => {
    await whenOpening();
    await whenClicking(selector);

    expect(text('atelier-engagement-introduction')).toContain('ne porte aucune date');
    expect(text('atelier-candidat-designation')).toBe('');
  });

  it('should open the engagement dialog already aimed at the element the referential pointed at', async () => {
    givenUrlTargets('of-1');
    givenReferential();
    await whenOpening();

    expect(text('atelier-candidat-designation')).toBe('OF-2026-000042');
  });

  it('should refresh what is at the workshop once an element has been engaged', async () => {
    givenReferential();
    givenPhotographs();
    await whenOpening();
    await whenClicking('atelier-new');
    await whenClickingFirst('engageable-engage');
    await whenDialogsClosed();

    expect(texts('atelier-nom-cell')).toEqual(['PRD-2026-000001']);
  });

  it('should not read the workshop again when the engagement dialog is dismissed', async () => {
    givenReferential();
    await whenOpening();
    await whenClicking('atelier-new');
    const lecturesAvant = port.lectures.length;
    await whenDismissingDialog();

    expect(port.lectures).toHaveLength(lecturesAvant);
  });

  it('should refresh what is at the workshop once an element has been closed', async () => {
    givenWorkshop();
    await whenOpening();
    await whenClickingFirst('atelier-close');
    await whenClicking('atelier-cloture-confirm');
    await whenDialogsClosed();

    expect(port.clotures.map(suivi => suivi.value)).toEqual(['suivi-1']);
    expect(texts('atelier-nom-cell')).toEqual(['OF-2026-000042']);
  });

  it('should ask the workshop for the page the manager navigated to', async () => {
    givenManyElements(25);
    await whenOpening();
    await whenNavigatingToNextPage();

    expect(texts('atelier-nom-cell')).toHaveLength(5);
    expect(texts('atelier-nom-cell')[0]).toBe('PRD-2026-20');
  });

  it('should keep the most recently requested page when an older response arrives last', async () => {
    givenManyElements(21);
    await whenOpening();
    const obsolete = new DeferredFixture<Page<ElementALAtelier>>();
    givenReadingIsPending(obsolete);
    const arrival = port.signalLecture();
    whenSelectingPage(0, 20);
    await arrival;
    givenReadingSucceeds();
    await whenPageSelected(1, 20);
    obsolete.resolve(new Page([mouleEnCoursFixture], 1));
    await whenViewSettles();

    expect(texts('atelier-nom-cell')).toEqual(['PRD-2026-20']);
    expect(text('atelier-pagination')).toContain('21–21 sur 21');
  });

  it('should keep loading the current page when an obsolete read fails', async () => {
    givenManyElements(21);
    await whenOpening();
    const obsolete = new DeferredFixture<Page<ElementALAtelier>>();
    givenReadingIsPending(obsolete);
    const premiereArrivee = port.signalLecture();
    whenSelectingPage(0, 20);
    await premiereArrivee;
    const courante = new DeferredFixture<Page<ElementALAtelier>>();
    givenReadingIsPending(courante);
    const secondeArrivee = port.signalLecture();
    whenSelectingPage(1, 20);
    await secondeArrivee;
    obsolete.reject(new Error('Obsolete read failed'));
    await whenViewSettles();
    const loading = text('atelier-loading');
    const failure = text('atelier-error');
    courante.resolve(new Page([ofEnAttenteFixture], 21));
    await whenViewSettles();

    expect(loading).toContain('Chargement de l’atelier');
    expect(failure).toBe('');
    expect(texts('atelier-nom-cell')).toEqual(['OF-2026-000042']);
  });

  const givenWorkshop = (): void => {
    port.liste = [mouleEnCoursFixture, ofEnAttenteFixture];
  };
  const givenWorkshopWithClosedElement = (): void => {
    port.liste = [mouleEnCoursFixture, mouleClotureFixture];
  };
  const givenWorkshopForgotEverything = (): void => {
    port.liste = [];
  };
  const givenManyElements = (count: number): void => {
    port.liste = Array.from({ length: count }, (_, index) =>
      elementFixture(`suivi-${String(index)}`, `PRD-2026-${String(index)}`, 'PRODUIT', 'EN_ATTENTE', undefined),
    );
  };
  const givenReferential = (): void => {
    referentiel.liste = [
      new ElementEngageable(new ElementEngageId('moule-1'), {
        designation: new DesignationDElement(undefined, 'PRD-2026-000001'),
        type: 'PRODUIT',
      }),
      new ElementEngageable(new ElementEngageId('of-1'), {
        designation: new DesignationDElement(undefined, 'OF-2026-000042'),
        type: 'ORDRE_DE_FABRICATION',
      }),
    ];
  };
  const givenPhotographs = (): void => {
    port.photographies.set('moule-1', { nom: 'PRD-2026-000001', type: 'PRODUIT' });
  };
  const givenUrlTargets = (element: string): void => {
    parametres = { element };
  };
  const givenReadingIsPending = (deferred: DeferredFixture<Page<ElementALAtelier>>): void => {
    port.lectureDifferee = deferred.promise;
  };
  const givenReadingFails = (): void => {
    port.lectureFailure = new Error('Network down');
  };
  const givenReadingSucceeds = (): void => {
    port.lectureFailure = undefined;
    port.lectureDifferee = undefined;
  };
  const givenWritingFails = (): void => {
    port.ecritureFailure = new Error('Network down');
  };

  const whenOpening = async (): Promise<void> => {
    fixture = TestBed.createComponent(Atelier);
    await whenViewSettles();
  };

  const whenViewSettles = async (): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve));
    await fixture.whenStable();
  };

  const whenClicking = async (selector: string): Promise<void> => {
    requiredFixture(document.querySelector<HTMLButtonElement>(dataSelector(selector)), selector).click();
    await whenViewSettles();
  };

  const whenClickingFirst = async (selector: string): Promise<void> => {
    requiredFixture([...document.querySelectorAll<HTMLButtonElement>(dataSelector(selector))][0], selector).click();
    await whenViewSettles();
  };

  const whenSelectingPage = (pageIndex: number, pageSize: number): void => {
    fixture.debugElement.query(By.css(dataSelector('atelier-pagination'))).triggerEventHandler('page', { pageIndex, pageSize });
  };

  const whenPageSelected = async (pageIndex: number, pageSize: number): Promise<void> => {
    whenSelectingPage(pageIndex, pageSize);
    await whenViewSettles();
  };

  const whenNavigatingToNextPage = async (): Promise<void> => {
    requiredFixture(document.querySelector<HTMLButtonElement>('button[aria-label="Page suivante"]'), 'next page').click();
    await whenViewSettles();
  };

  const whenDismissingDialog = async (): Promise<void> => {
    const dialogs = TestBed.inject(MatDialog);
    const fermeture = firstValueFrom(dialogs.afterAllClosed);
    dialogs.closeAll();
    await fermeture;
    await whenViewSettles();
  };

  const whenDialogsClosed = async (): Promise<void> => {
    await vi.waitUntil(() => TestBed.inject(MatDialog).openDialogs.length === 0);
    await whenViewSettles();
  };

  const text = (selector: string): string => document.querySelector(dataSelector(selector))?.textContent.trim() ?? '';
  const texts = (selector: string): string[] =>
    [...document.querySelectorAll(dataSelector(selector))].map(element => element.textContent.trim());
});
