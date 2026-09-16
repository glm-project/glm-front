import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { Component } from '@angular/core';
import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { AtelierFixture, AUTEUR_FIXTURE, ENGAGEMENT_FIXTURE } from '@test/unit/fixtures/gestion/atelier/AtelierFixture';
import { dataSelector } from '@test/utils/DataSelector';
import { requiredFixture } from '@test/utils/RequiredFixture';
import { firstValueFrom } from 'rxjs';
import { ActeDAtelier } from '../../../domain/ActeDAtelier';
import { AtelierPort } from '../../../domain/AtelierPort';
import { ElementALAtelier } from '../../../domain/ElementALAtelier';
import { InstantDAtelier } from '../../../domain/InstantDAtelier';
import { NomDElementEngage } from '../../../domain/NomDElementEngage';
import { SuiviId } from '../../../domain/SuiviId';
import { SuiviIntrouvable } from '../../../domain/SuiviIntrouvable';
import { ConfirmationClotureDialog, ConfirmationClotureDialogData } from './ConfirmationClotureDialog';

@Component({ template: '' })
class DialogHostFixture {}

const mouleFixture = new ElementALAtelier(new SuiviId('suivi-1'), {
  nom: new NomDElementEngage('PRD-2026-000001'),
  type: 'PRODUIT',
  etat: 'EN_COURS',
  engagement: new ActeDAtelier(new InstantDAtelier(ENGAGEMENT_FIXTURE), AUTEUR_FIXTURE),
  cloture: undefined,
});

describe('ConfirmationClotureDialog', () => {
  let fixture: ComponentFixture<DialogHostFixture>;
  let port: AtelierFixture;
  let closed: (boolean | undefined)[];

  beforeEach(() => {
    port = new AtelierFixture();
    closed = [];
    TestBed.configureTestingModule({
      providers: [
        { provide: ComponentFixtureAutoDetect, useValue: true },
        { provide: AtelierPort, useValue: port },
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

  it('should say what closing costs the operators and that it can be undone', async () => {
    await whenOpening();

    expect(text('atelier-cloture-description')).toContain('PRD-2026-000001');
    expect(text('atelier-cloture-description')).toContain('disparaîtra des écrans des opérateurs');
    expect(text('atelier-cloture-description')).toContain('rouvrir à tout moment');
  });

  it('should close the tracked element and dismiss itself', async () => {
    givenElementIsTracked();
    await whenOpening();
    await whenClicking('atelier-cloture-confirm');
    await whenDismissed();

    expect(port.clotures.map(suivi => suivi.value)).toEqual(['suivi-1']);
    expect(closed).toEqual([true]);
  });

  it('should display a refusal without dismissing the dialog', async () => {
    await whenOpening();
    await whenClicking('atelier-cloture-confirm');

    expect(text('atelier-cloture-refusal')).toBe(new SuiviIntrouvable().message);
    expect(closed).toEqual([]);
  });

  it('should report a technical failure and leave the dialog open', async () => {
    givenClosingFails();
    await whenOpening();
    await whenClicking('atelier-cloture-confirm');

    expect(text('atelier-cloture-technical-error')).toContain('La clôture a échoué');
    expect(closed).toEqual([]);
  });

  it('should ignore a second click while the closure is still in flight', async () => {
    givenElementIsTracked();
    givenClosingIsPending();
    await whenOpening();
    await whenClickingTwiceInARow('atelier-cloture-confirm');

    expect(port.clotures).toHaveLength(1);
  });

  const givenElementIsTracked = (): void => {
    port.liste = [mouleFixture];
  };
  const givenClosingFails = (): void => {
    port.ecritureFailure = new Error('Network down');
  };
  const givenClosingIsPending = (): void => {
    port.clotureDifferee = new Promise(() => undefined);
  };

  const whenOpening = async (): Promise<void> => {
    const data: ConfirmationClotureDialogData = { element: mouleFixture };
    const dialog = TestBed.inject(MatDialog).open<ConfirmationClotureDialog, ConfirmationClotureDialogData, boolean>(
      ConfirmationClotureDialog,
      { data },
    );
    dialog.afterClosed().subscribe(resultat => closed.push(resultat));
    await fixture.whenStable();
  };

  const whenClicking = async (selector: string): Promise<void> => {
    requiredFixture(document.querySelector<HTMLButtonElement>(dataSelector(selector)), selector).click();
    await fixture.whenStable();
  };

  const whenClickingTwiceInARow = async (selector: string): Promise<void> => {
    const bouton = requiredFixture(document.querySelector<HTMLButtonElement>(dataSelector(selector)), selector);
    bouton.click();
    bouton.click();
    await fixture.whenStable();
  };

  const whenDismissed = async (): Promise<void> => {
    await vi.waitUntil(() => closed.length > 0);
    await fixture.whenStable();
  };

  const text = (selector: string): string => document.querySelector(dataSelector(selector))?.textContent.trim() ?? '';
});
