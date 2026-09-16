import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { err, Result } from '@/app/shared/result/domain/Result';
import { Component } from '@angular/core';
import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { DeferredFixture } from '@test/unit/fixtures/DeferredFixture';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { OperateursFixture } from '@test/unit/fixtures/gestion/operateur/OperateursFixture';
import { dataSelector } from '@test/utils/DataSelector';
import { requiredFixture } from '@test/utils/RequiredFixture';
import { firstValueFrom } from 'rxjs';
import { Matricule } from '../../../domain/Matricule';
import { NomOperateur } from '../../../domain/NomOperateur';
import { Operateur } from '../../../domain/Operateur';
import { OperateurAyantPointe } from '../../../domain/OperateurAyantPointe';
import { OperateurId } from '../../../domain/OperateurId';
import { OperateurIntrouvable } from '../../../domain/OperateurIntrouvable';
import { OperateursPort } from '../../../domain/OperateursPort';
import { PrenomOperateur } from '../../../domain/PrenomOperateur';
import { RefusSuppressionOperateur } from '../../../domain/RefusSuppressionOperateur';
import { TauxHoraire } from '../../../domain/TauxHoraire';
import {
  ConfirmationSuppressionOperateurDialog,
  ConfirmationSuppressionOperateurDialogData,
} from './ConfirmationSuppressionOperateurDialog';

@Component({ template: '' })
class DialogHostFixture {}

const jeanFixture = new Operateur(new OperateurId('jean'), {
  nom: new NomOperateur('Dupont'),
  prenom: new PrenomOperateur('Jean'),
  matricule: new Matricule('049'),
  tauxHoraire: new TauxHoraire(22),
  postes: [],
  natures: [],
});

describe('ConfirmationSuppressionOperateurDialog', () => {
  let fixture: ComponentFixture<DialogHostFixture>;
  let port: OperateursFixture;
  let errors: ErrorHandlerFixture;
  let dialog: MatDialogRef<ConfirmationSuppressionOperateurDialog, boolean>;
  let closed: (boolean | undefined)[];
  let fermeture: Promise<boolean | undefined>;

  beforeEach(() => {
    port = new OperateursFixture();
    errors = new ErrorHandlerFixture();
    closed = [];
    fermeture = Promise.resolve(undefined);
    TestBed.configureTestingModule({
      providers: [
        { provide: ComponentFixtureAutoDetect, useValue: true },
        { provide: OperateursPort, useValue: port },
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

  it('should name the operator it is about to remove', async () => {
    await whenOpening();

    expect(text('operateur-delete-description')).toContain('Jean Dupont');
  });

  it('should remove the operator and close after success', async () => {
    await whenOpening();
    await whenConfirming();
    await whenClosed();

    expect(port.suppressions).toEqual([jeanFixture.id]);
    expect(closed).toEqual([true]);
  });

  it('should explain why an operator who clocked time cannot be removed', async () => {
    givenOperateurHasClockedTime();
    await whenOpening();
    await whenConfirming();

    expect(text('operateur-delete-refusal')).toContain('du temps est déjà pointé à son nom');
    expect(closed).toEqual([]);
  });

  it('should explain that the operator has already vanished', async () => {
    givenOperateurIsMissing();
    await whenOpening();
    await whenConfirming();

    expect(text('operateur-delete-refusal')).toContain('Cet opérateur n’existe plus.');
    expect(closed).toEqual([]);
  });

  it('should report a technical failure and let the manager retry', async () => {
    givenRemovalFails();
    await whenOpening();
    await whenConfirming();

    expect(text('operateur-delete-technical-error')).toContain('La suppression a échoué.');
    expect(errors.errors).toHaveLength(1);
    expect(closed).toEqual([]);
  });

  it('should send only one removal when confirmation is clicked twice before rendering', async () => {
    const deferred = new DeferredFixture<Result<void, RefusSuppressionOperateur>>();
    givenRemovalIsPending(deferred);
    await whenOpening();
    await whenConfirmingTwice();
    const busy = button('operateur-delete-confirm').disabled;
    deferred.resolve({ ok: true, value: undefined });
    await whenClosed();

    expect(busy).toBe(true);
    expect(port.suppressions).toEqual([jeanFixture.id]);
    expect(closed).toEqual([true]);
  });

  it('should cancel without removing', async () => {
    await whenOpening();
    await whenClicking('operateur-delete-cancel');
    await whenClosed();

    expect(port.suppressions).toEqual([]);
    expect(closed).toEqual([false]);
  });

  const givenOperateurHasClockedTime = (): void => {
    port.suppression = err(new OperateurAyantPointe());
  };
  const givenOperateurIsMissing = (): void => {
    port.suppression = err(new OperateurIntrouvable());
  };
  const givenRemovalFails = (): void => {
    port.ecritureFailure = new Error('Network down');
  };
  const givenRemovalIsPending = (deferred: DeferredFixture<Result<void, RefusSuppressionOperateur>>): void => {
    port.suppressionDifferee = deferred.promise;
  };

  const whenOpening = async (): Promise<void> => {
    dialog = TestBed.inject(MatDialog).open<ConfirmationSuppressionOperateurDialog, ConfirmationSuppressionOperateurDialogData, boolean>(
      ConfirmationSuppressionOperateurDialog,
      { data: { operateur: jeanFixture } },
    );
    fermeture = firstValueFrom(dialog.afterClosed());
    dialog.afterClosed().subscribe(result => closed.push(result));
    await fixture.whenStable();
  };
  const whenClosed = async (): Promise<void> => {
    await fermeture;
    await fixture.whenStable();
  };
  const whenConfirming = async (): Promise<void> => {
    await whenClicking('operateur-delete-confirm');
  };
  const whenConfirmingTwice = async (): Promise<void> => {
    const confirm = button('operateur-delete-confirm');
    confirm.click();
    confirm.click();
    await fixture.whenStable();
  };
  const whenClicking = async (selector: string): Promise<void> => {
    requiredFixture(document.querySelector<HTMLElement>(dataSelector(selector)), selector).click();
    await fixture.whenStable();
  };
  const button = (selector: string): HTMLButtonElement =>
    requiredFixture(document.querySelector<HTMLButtonElement>(dataSelector(selector)), selector);
  const text = (selector: string): string => document.querySelector(dataSelector(selector))?.textContent.trim() ?? '';
});
