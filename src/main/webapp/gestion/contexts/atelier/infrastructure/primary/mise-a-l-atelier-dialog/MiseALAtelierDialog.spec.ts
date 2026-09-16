import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { Page } from '@/app/shared/pagination/domain/Page';
import { Component } from '@angular/core';
import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { DeferredFixture } from '@test/unit/fixtures/DeferredFixture';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { AtelierFixture } from '@test/unit/fixtures/gestion/atelier/AtelierFixture';
import { ElementsEngageablesFixture } from '@test/unit/fixtures/gestion/atelier/ElementsEngageablesFixture';
import { dataSelector } from '@test/utils/DataSelector';
import { requiredFixture } from '@test/utils/RequiredFixture';
import { firstValueFrom } from 'rxjs';
import { AtelierPort } from '../../../domain/AtelierPort';
import { DesignationDElement } from '../../../domain/DesignationDElement';
import { ElementDejaALAtelier } from '../../../domain/ElementDejaALAtelier';
import { ElementEngageable } from '../../../domain/ElementEngageable';
import { ElementEngageId } from '../../../domain/ElementEngageId';
import { ElementsEngageablesPort } from '../../../domain/ElementsEngageablesPort';
import { TypeDElementEngage } from '../../../domain/TypeDElementEngage';
import { MiseALAtelierDialog, MiseALAtelierDialogData } from './MiseALAtelierDialog';

@Component({ template: '' })
class DialogHostFixture {}

const engageable = (id: string, reference: string | undefined, nom: string, type: TypeDElementEngage): ElementEngageable =>
  new ElementEngageable(new ElementEngageId(id), { designation: new DesignationDElement(reference, nom), type });

const mouleFixture = engageable('moule-1', '1015', 'PRD-2026-000001', 'PRODUIT');
const ofFixture = engageable('of-1', undefined, 'OF-2026-000042', 'ORDRE_DE_FABRICATION');

describe('MiseALAtelierDialog', () => {
  let fixture: ComponentFixture<DialogHostFixture>;
  let atelier: AtelierFixture;
  let referentiel: ElementsEngageablesFixture;
  let closed: (boolean | undefined)[];

  beforeEach(() => {
    atelier = new AtelierFixture();
    referentiel = new ElementsEngageablesFixture();
    closed = [];
    TestBed.configureTestingModule({
      providers: [
        { provide: ComponentFixtureAutoDetect, useValue: true },
        { provide: AtelierPort, useValue: atelier },
        { provide: ElementsEngageablesPort, useValue: referentiel },
        { provide: ErrorHandlerPort, useClass: ErrorHandlerFixture },
      ],
    });
    fixture = TestBed.createComponent(DialogHostFixture);
  });

  afterEach(async () => {
    const dialogs = TestBed.inject(MatDialog);
    const fermeture = firstValueFrom(dialogs.afterAllClosed);
    dialogs.closeAll();
    await fermeture;
  });

  it('should say the act carries no date at all', async () => {
    await whenOpening(undefined);

    expect(text('atelier-engagement-introduction')).toContain('ne porte aucune date');
  });

  it('should show loading before the referential answers', async () => {
    const deferred = new DeferredFixture<Page<ElementEngageable>>();
    givenReadingIsPending(deferred);
    await whenOpening(undefined);
    const loading = text('atelier-engagement-loading');
    deferred.resolve(new Page([], 0));
    await whenViewSettles();

    expect(loading).toContain('Chargement du référentiel');
  });

  it('should designate each engageable element by its company number, falling back to its produced name', async () => {
    givenReferential();
    await whenOpening(undefined);

    expect(texts('engageable-type-cell')).toEqual(['Moule', 'OF']);
    expect(texts('engageable-designation-cell')).toEqual(['1015', 'OF-2026-000042']);
  });

  it('should say the referential is empty rather than show a bare table', async () => {
    await whenOpening(undefined);

    expect(text('atelier-engagement-empty')).toContain('Aucun moule ni OF');
    expect(text('atelier-engagement-pagination')).toContain('0 élément');
  });

  it('should ignore a second click while the engagement is still in flight', async () => {
    givenReferential();
    givenEngagementIsPending();
    await whenOpening(undefined);
    await whenClickingTwiceInARow('engageable-engage');

    expect(atelier.engagements).toHaveLength(1);
  });

  it('should put the chosen element at the workshop and dismiss itself', async () => {
    givenReferential();
    givenPhotographs();
    await whenOpening(undefined);
    await whenClickingFirst('engageable-engage');
    await whenDismissed();

    expect(atelier.engagements.map(element => element.value)).toEqual(['moule-1']);
    expect(closed).toEqual([true]);
  });

  it('should explain a refusal without dismissing the dialog', async () => {
    givenReferential();
    givenPhotographs();
    givenElementAlreadyAtWorkshop();
    await whenOpening(undefined);
    await whenClickingFirst('engageable-engage');

    expect(text('atelier-engagement-refusal')).toBe(new ElementDejaALAtelier().message);
    expect(closed).toEqual([]);
  });

  it('should report a technical write failure and leave the dialog open', async () => {
    givenReferential();
    givenWritingFails();
    await whenOpening(undefined);
    await whenClickingFirst('engageable-engage');

    expect(text('atelier-engagement-technical-error')).toContain('La mise à l’atelier a échoué');
    expect(closed).toEqual([]);
  });

  it('should allow retry after a referential failure', async () => {
    givenReadingFails();
    await whenOpening(undefined);
    const failure = text('atelier-engagement-error');
    givenReadingSucceeds();
    givenReferential();
    await whenClicking('atelier-engagement-retry');

    expect(failure).toContain('Impossible de charger le référentiel');
    expect(texts('engageable-row')).toHaveLength(2);
  });

  it('should target the element the referential screen pointed at', async () => {
    givenReferential();
    givenPhotographs();
    await whenOpening(new ElementEngageId('of-1'));

    expect(text('atelier-candidat-type')).toBe('OF');
    expect(text('atelier-candidat-designation')).toBe('OF-2026-000042');
    expect(texts('engageable-row')).toEqual([]);
  });

  it('should put the targeted element at the workshop and dismiss itself', async () => {
    givenReferential();
    givenPhotographs();
    await whenOpening(new ElementEngageId('of-1'));
    await whenClicking('atelier-engagement-confirm');
    await whenDismissed();

    expect(atelier.engagements.map(element => element.value)).toEqual(['of-1']);
    expect(closed).toEqual([true]);
  });

  it('should say so when the targeted element has left the referential', async () => {
    givenReferential();
    await whenOpening(new ElementEngageId('disparu'));

    expect(text('atelier-engagement-missing')).toContain('n’existe plus dans le référentiel');
  });

  it('should ask the referential for the page the manager navigated to', async () => {
    givenManyElements(25);
    await whenOpening(undefined);
    await whenNavigatingToNextPage();

    expect(texts('engageable-designation-cell')).toHaveLength(5);
    expect(texts('engageable-designation-cell')[0]).toBe('PRD-2026-20');
  });

  const givenReferential = (): void => {
    referentiel.liste = [mouleFixture, ofFixture];
  };
  const givenManyElements = (count: number): void => {
    referentiel.liste = Array.from({ length: count }, (_, index) =>
      engageable(`e-${String(index)}`, undefined, `PRD-2026-${String(index)}`, 'PRODUIT'),
    );
  };
  const givenPhotographs = (): void => {
    atelier.photographies.set('moule-1', { nom: 'PRD-2026-000001', type: 'PRODUIT' });
    atelier.photographies.set('of-1', { nom: 'OF-2026-000042', type: 'ORDRE_DE_FABRICATION' });
  };
  const givenElementAlreadyAtWorkshop = (): void => {
    atelier.liste = [];
    atelier.engagementDiffere = Promise.resolve({ ok: false, error: new ElementDejaALAtelier() });
  };
  const givenEngagementIsPending = (): void => {
    atelier.engagementDiffere = new Promise(() => undefined);
  };
  const givenWritingFails = (): void => {
    atelier.ecritureFailure = new Error('Network down');
  };
  const givenReadingIsPending = (deferred: DeferredFixture<Page<ElementEngageable>>): void => {
    referentiel.lectureDifferee = deferred.promise;
  };
  const givenReadingFails = (): void => {
    referentiel.lectureFailure = new Error('Network down');
  };
  const givenReadingSucceeds = (): void => {
    referentiel.lectureFailure = undefined;
    referentiel.lectureDifferee = undefined;
  };

  const whenOpening = async (preselection: ElementEngageId | undefined): Promise<void> => {
    const data: MiseALAtelierDialogData = { preselection };
    const dialog = TestBed.inject(MatDialog).open<MiseALAtelierDialog, MiseALAtelierDialogData, boolean>(MiseALAtelierDialog, {
      data,
    });
    dialog.afterClosed().subscribe(resultat => closed.push(resultat));
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

  const whenClickingTwiceInARow = async (selector: string): Promise<void> => {
    const bouton = requiredFixture([...document.querySelectorAll<HTMLButtonElement>(dataSelector(selector))][0], selector);
    bouton.click();
    bouton.click();
    await whenViewSettles();
  };

  const whenNavigatingToNextPage = async (): Promise<void> => {
    requiredFixture(document.querySelector<HTMLButtonElement>('button[aria-label="Page suivante"]'), 'next page').click();
    await whenViewSettles();
  };

  const whenDismissed = async (): Promise<void> => {
    await vi.waitUntil(() => closed.length > 0);
    await fixture.whenStable();
  };

  const text = (selector: string): string => document.querySelector(dataSelector(selector))?.textContent.trim() ?? '';
  const texts = (selector: string): string[] =>
    [...document.querySelectorAll(dataSelector(selector))].map(element => element.textContent.trim());
});
