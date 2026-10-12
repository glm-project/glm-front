import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { Result } from '@/app/shared/result/domain/Result';
import { Component } from '@angular/core';
import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { ActesDAtelierFixture } from '@test/unit/fixtures/gestion/element-de-fabrication/ActesDAtelierFixture';
import { dataSelector } from '@test/utils/DataSelector';
import { requiredFixture } from '@test/utils/RequiredFixture';
import { firstValueFrom } from 'rxjs';
import { ActesDAtelierPort } from '../../../domain/ActesDAtelierPort';
import { PassageIntrouvable } from '../../../domain/PassageIntrouvable';
import { RefusDActeDAtelier } from '../../../domain/RefusDActeDAtelier';
import { SuiviDuProduitId } from '../../../domain/SuiviDuProduitId';
import { ConfirmationClotureDialog, ConfirmationClotureDialogData } from './ConfirmationClotureDialog';

@Component({ template: '' })
class DialogHostFixture {}

describe('ConfirmationClotureDialog of a product', () => {
  let fixture: ComponentFixture<DialogHostFixture>;
  let actes: ActesDAtelierFixture;
  let errors: ErrorHandlerFixture;
  let closed: (boolean | undefined)[];
  let fermeture: Promise<boolean | undefined>;

  beforeEach(() => {
    actes = new ActesDAtelierFixture();
    errors = new ErrorHandlerFixture();
    closed = [];
    TestBed.configureTestingModule({
      providers: [
        { provide: ComponentFixtureAutoDetect, useValue: true },
        { provide: ActesDAtelierPort, useValue: actes },
        { provide: ErrorHandlerPort, useValue: errors },
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

    expect(text('element-cloture-description')).toBe(
      'M-2 disparaîtra des écrans des opérateurs, qui ne pourront plus pointer dessus. Vous pourrez le rouvrir à tout moment.',
    );
  });

  it('should close the passage of the product and dismiss itself', async () => {
    givenPassageIsOpen();
    await whenOpening();

    await whenConfirming();
    await whenDismissed();

    expect(actes.clotures).toEqual(['suivi-moule-2']);
    expect(closed).toEqual([true]);
  });

  it('should display a refusal without dismissing the dialog', async () => {
    await whenOpening();

    await whenConfirming();

    expect(text('element-cloture-refusal')).toBe(new PassageIntrouvable().message);
    expect(closed).toEqual([]);
  });

  it('should report a technical failure and leave the dialog open', async () => {
    givenClosingFails();
    await whenOpening();

    await whenConfirming();

    expect(text('element-cloture-technical-error')).toBe('La clôture a échoué. Vérifiez la connexion puis réessayez.');
    expect(errors.errors).toEqual([new Error('Network down')]);
    expect(closed).toEqual([]);
  });

  it('should ignore a second click while the closure is still in flight', async () => {
    givenClosingIsPending();
    await whenOpening();

    await whenConfirmingTwiceInARow();

    expect(actes.clotures).toHaveLength(1);
  });

  it('should be cancelled without closing anything', async () => {
    await whenOpening();

    await whenClicking('element-cloture-cancel');
    await whenDismissed();

    expect(actes.clotures).toEqual([]);
    expect(closed).toEqual([false]);
  });

  const givenPassageIsOpen = (): void => {
    actes.suivisOuverts = ['suivi-moule-2'];
  };
  const givenClosingFails = (): void => {
    actes.ecritureFailure = new Error('Network down');
  };
  const givenClosingIsPending = (): void => {
    actes.clotureDifferee = new Promise<Result<void, RefusDActeDAtelier>>(() => undefined);
  };

  const whenOpening = async (): Promise<void> => {
    const data: ConfirmationClotureDialogData = { numero: 'M-2', suivi: new SuiviDuProduitId('suivi-moule-2') };
    const dialog = TestBed.inject(MatDialog).open<ConfirmationClotureDialog, ConfirmationClotureDialogData, boolean>(
      ConfirmationClotureDialog,
      { data },
    );
    fermeture = firstValueFrom(dialog.afterClosed());
    dialog.afterClosed().subscribe(resultat => closed.push(resultat));
    await fixture.whenStable();
  };
  const whenConfirming = async (): Promise<void> => {
    await whenClicking('element-cloture-confirm');
    await whenViewSettles();
  };
  const whenConfirmingTwiceInARow = async (): Promise<void> => {
    const bouton = requiredFixture(document.querySelector<HTMLButtonElement>(dataSelector('element-cloture-confirm')), 'confirm');
    bouton.click();
    bouton.click();
    await fixture.whenStable();
  };
  const whenClicking = async (selector: string): Promise<void> => {
    requiredFixture(document.querySelector<HTMLButtonElement>(dataSelector(selector)), selector).click();
    await fixture.whenStable();
  };
  const whenDismissed = async (): Promise<void> => {
    await fermeture;
    await fixture.whenStable();
  };
  const whenViewSettles = async (): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve));
    await fixture.whenStable();
  };
  const text = (selector: string): string => document.querySelector(dataSelector(selector))?.textContent.trim() ?? '';
});
