import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { err, ok, Result } from '@/app/shared/result/domain/Result';
import { Component } from '@angular/core';
import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { DeferredFixture } from '@test/unit/fixtures/DeferredFixture';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { PostesFixture } from '@test/unit/fixtures/gestion/poste/PostesFixture';
import { dataSelector } from '@test/utils/DataSelector';
import { requiredFixture } from '@test/utils/RequiredFixture';
import { firstValueFrom } from 'rxjs';
import { PostesCoordinator } from '../../../application/PostesCoordinator';
import { LibellePoste } from '../../../domain/LibellePoste';
import { NatureDeTravail } from '../../../domain/NatureDeTravail';
import { PosteDeTravail } from '../../../domain/PosteDeTravail';
import { PosteDeTravailId } from '../../../domain/PosteDeTravailId';
import { PosteIntrouvable } from '../../../domain/PosteIntrouvable';
import { PosteNonSupprimable } from '../../../domain/PosteNonSupprimable';
import { PostesPort } from '../../../domain/PostesPort';
import { RefusSuppressionPoste } from '../../../domain/RefusSuppressionPoste';
import { ConfirmationSuppressionPosteDialog } from './ConfirmationSuppressionPosteDialog';

@Component({ template: '' })
class DialogHostFixture {}

const tourFixture = new PosteDeTravail(new PosteDeTravailId('tour-1'), {
  libelle: new LibellePoste('Tour 1'),
  nature: new NatureDeTravail('tournage'),
  coutHoraire: undefined,
});

describe('ConfirmationSuppressionPosteDialog', () => {
  let fixture: ComponentFixture<DialogHostFixture>;
  let port: PostesFixture;
  let errors: ErrorHandlerFixture;
  let dialog: MatDialogRef<ConfirmationSuppressionPosteDialog, boolean>;
  let closed: (boolean | undefined)[];
  let fermeture: Promise<boolean | undefined>;
  beforeEach(() => {
    port = new PostesFixture();
    errors = new ErrorHandlerFixture();
    closed = [];
    fermeture = Promise.resolve(undefined);
    TestBed.configureTestingModule({
      providers: [
        { provide: ComponentFixtureAutoDetect, useValue: true },
        PostesCoordinator,
        { provide: PostesPort, useValue: port },
        { provide: ErrorHandlerPort, useValue: errors },
      ],
    });
    fixture = TestBed.createComponent(DialogHostFixture);
  });
  afterEach(async () => {
    TestBed.inject(MatDialog).closeAll();
    await fermeture;
    await fixture.whenStable();
  });

  it('should identify the workstation before asking for confirmation', async () => {
    await whenOpening();

    expect(text('poste-delete-description')).toContain('Tour 1');
    expect(port.suppressions).toEqual([]);
  });

  it('should cancel without removing the workstation', async () => {
    await whenOpening();
    await whenClicking('poste-delete-cancel');
    await whenClosed();

    expect(port.suppressions).toEqual([]);
    expect(closed).toEqual([false]);
  });

  it('should remove the confirmed workstation and close after success', async () => {
    await whenOpening();
    await whenClicking('poste-delete-confirm');
    await whenClosed();

    expect(port.suppressions).toEqual([tourFixture.id]);
    expect(closed).toEqual([true]);
  });

  it.each([new PosteNonSupprimable(), new PosteIntrouvable()])('should display the refusal without closing: %s', async refus => {
    port.suppression = err(refus);
    await whenOpening();
    await whenClicking('poste-delete-confirm');

    expect(text('poste-delete-refusal')).toBe(refus.message);
    expect(closed).toEqual([]);
  });

  it('should report a technical failure and leave the dialog open', async () => {
    port.ecritureFailure = new Error('Network down');
    await whenOpening();
    await whenClicking('poste-delete-confirm');

    expect(text('poste-delete-technical-error')).toContain('La suppression a échoué');
    expect(errors.errors).toEqual([new Error('Network down')]);
    expect(closed).toEqual([]);
  });

  it('should send only one deletion when confirmation is clicked twice before rendering', async () => {
    const deferred = new DeferredFixture<Result<void, RefusSuppressionPoste>>();
    port.suppressionDifferee = deferred.promise;
    await whenOpening();
    await whenConfirmingTwice();
    const busy = button('poste-delete-confirm').disabled;
    const protectedClose = dialog.disableClose;
    deferred.resolve(ok(undefined));
    await whenClosed();

    expect(port.suppressions).toHaveLength(1);
    expect(busy).toBe(true);
    expect(protectedClose).toBe(true);
    expect(closed).toEqual([true]);
  });

  const whenOpening = async (): Promise<void> => {
    dialog = TestBed.inject(MatDialog).open<ConfirmationSuppressionPosteDialog, PosteDeTravail, boolean>(
      ConfirmationSuppressionPosteDialog,
      { data: tourFixture },
    );
    fermeture = firstValueFrom(dialog.afterClosed());
    dialog.afterClosed().subscribe(result => closed.push(result));
    await fixture.whenStable();
  };
  const whenClosed = async (): Promise<void> => {
    await fermeture;
    await fixture.whenStable();
  };
  const whenClicking = async (selector: string): Promise<void> => {
    button(selector).click();
    await fixture.whenStable();
  };
  const whenConfirmingTwice = async (): Promise<void> => {
    const confirm = button('poste-delete-confirm');
    confirm.click();
    confirm.click();
    await fixture.whenStable();
  };
  const button = (selector: string): HTMLButtonElement =>
    requiredFixture(document.querySelector<HTMLButtonElement>(dataSelector(selector)), selector);
  const text = (selector: string): string => document.querySelector(dataSelector(selector))?.textContent.trim() ?? '';
});
