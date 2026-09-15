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
import { CoutHoraire } from '../../../domain/CoutHoraire';
import { LibellePoste } from '../../../domain/LibellePoste';
import { LibellePosteDejaUtilise } from '../../../domain/LibellePosteDejaUtilise';
import { NatureDeTravail } from '../../../domain/NatureDeTravail';
import { PosteDeTravail } from '../../../domain/PosteDeTravail';
import { PosteDeTravailId } from '../../../domain/PosteDeTravailId';
import { PosteIntrouvable } from '../../../domain/PosteIntrouvable';
import { PostesPort } from '../../../domain/PostesPort';
import { PosteFormDialog, PosteFormDialogData } from './PosteFormDialog';

@Component({ template: '' })
class DialogHostFixture {}

describe('PosteFormDialog', () => {
  let fixture: ComponentFixture<DialogHostFixture>;
  let port: PostesFixture;
  let errors: ErrorHandlerFixture;
  let dialog: MatDialogRef<PosteFormDialog, boolean>;
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

  it('should display domain validation and keep the dialog open when entries are invalid', async () => {
    await whenOpening();
    await whenSubmitting();

    expect(text('poste-libelle-error')).toContain('Le libellé est obligatoire');
    expect(text('poste-nature-error')).toContain('La nature est obligatoire');
    expect(port.enregistrements).toEqual([]);
    expect(closed).toEqual([]);
  });

  it('should create a workstation from the entered values and close after success', async () => {
    await whenOpening();
    await whenFillingValidEntries();
    await whenEntering('poste-cout', '45,5');
    await whenSubmitting();
    await whenClosed();

    expect(port.enregistrements).toEqual([
      {
        type: 'CREATION',
        libelle: new LibellePoste('Tour 1'),
        nature: new NatureDeTravail('tournage'),
        coutHoraire: new CoutHoraire(45.5),
      },
    ]);
    expect(closed).toEqual([true]);
  });

  it('should prefill and modify an existing workstation', async () => {
    const poste = new PosteDeTravail(new PosteDeTravailId('tour-1'), {
      libelle: new LibellePoste('Tour 1'),
      nature: new NatureDeTravail('tournage'),
      coutHoraire: new CoutHoraire(45.5),
    });
    await whenOpening(poste);
    const initialCost = input('poste-cout').value;
    await whenEntering('poste-libelle', 'Tour 2');
    await whenEntering('poste-cout', '');
    await whenSubmitting();
    await whenClosed();

    expect(initialCost).toBe('45.5');
    expect(port.enregistrements[0]).toEqual({
      type: 'MODIFICATION',
      id: new PosteDeTravailId('tour-1'),
      libelle: new LibellePoste('Tour 2'),
      nature: new NatureDeTravail('tournage'),
      coutHoraire: undefined,
    });
    expect(closed).toEqual([true]);
  });

  it('should show a duplicate label refusal until the manager changes the label', async () => {
    givenDuplicateLabelIsRefused();
    await whenOpening();
    await whenFillingValidEntries();
    await whenSubmitting();
    const duplicate = text('poste-libelle-error');
    const remainedOpen = closed.length;
    await whenEntering('poste-libelle', 'Tour 2');

    expect(duplicate).toContain('Un autre poste porte déjà ce libellé.');
    expect(remainedOpen).toBe(0);
    expect(text('poste-libelle-error')).toBe('');
  });

  it('should display a missing workstation refusal without closing', async () => {
    givenWorkstationIsMissing();
    await whenOpening(
      new PosteDeTravail(new PosteDeTravailId('tour-1'), {
        libelle: new LibellePoste('Tour 1'),
        nature: new NatureDeTravail('tournage'),
        coutHoraire: undefined,
      }),
    );
    await whenFillingValidEntries();
    await whenSubmitting();

    expect(text('poste-enregistrement-error')).toContain('Ce poste n’existe plus.');
    expect(closed).toEqual([]);
  });

  it('should display a technical failure and report it through the error boundary', async () => {
    givenSavingFails();
    await whenOpening();
    await whenFillingValidEntries();
    await whenSubmitting();

    expect(text('poste-technical-error')).toContain('L’enregistrement a échoué');
    expect(errors.errors).toEqual([new Error('Network down')]);
    expect(closed).toEqual([]);
  });

  it('should show an invalid hourly cost without submitting', async () => {
    await whenOpening();
    await whenFillingValidEntries();
    await whenEntering('poste-cout', '-2');
    await whenSubmitting();

    expect(text('poste-cout-error')).toContain('strictement positif');
    expect(port.enregistrements).toEqual([]);
  });

  it('should prevent duplicate submission while saving', async () => {
    const deferred = new DeferredFixture<Result<void, LibellePosteDejaUtilise>>();
    givenSavingIsPending(deferred);
    await whenOpening();
    await whenFillingValidEntries();
    await whenSubmitting();
    const busy = button('poste-save').disabled;
    await whenSubmitting();
    deferred.resolve(ok(undefined));
    await whenClosed();

    expect(busy).toBe(true);
    expect(port.enregistrements).toHaveLength(1);
    expect(closed).toEqual([true]);
  });

  it('should cancel without writing', async () => {
    await whenOpening();
    await whenClicking('poste-cancel');
    await whenClosed();

    expect(port.enregistrements).toEqual([]);
    expect(closed).toEqual([false]);
  });

  const givenDuplicateLabelIsRefused = (): void => {
    port.creation = err(new LibellePosteDejaUtilise());
  };
  const givenWorkstationIsMissing = (): void => {
    port.modification = err(new PosteIntrouvable());
  };
  const givenSavingFails = (): void => {
    port.ecritureFailure = new Error('Network down');
  };
  const givenSavingIsPending = (deferred: DeferredFixture<Result<void, LibellePosteDejaUtilise>>): void => {
    port.creationDifferee = deferred.promise;
  };

  const whenOpening = async (poste: PosteDeTravail | null = null): Promise<void> => {
    dialog = TestBed.inject(MatDialog).open<PosteFormDialog, PosteFormDialogData, boolean>(PosteFormDialog, {
      data: { poste },
    });
    fermeture = firstValueFrom(dialog.afterClosed());
    dialog.afterClosed().subscribe(result => closed.push(result));
    await fixture.whenStable();
  };
  const whenClosed = async (): Promise<void> => {
    await fermeture;
    await fixture.whenStable();
  };
  const whenEntering = async (selector: string, value: string): Promise<void> => {
    const field = input(selector);
    field.focus();
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
  };
  const whenFillingValidEntries = async (): Promise<void> => {
    await whenEntering('poste-libelle', 'Tour 1');
    await whenEntering('poste-nature', 'tournage');
  };
  const whenSubmitting = async (): Promise<void> => {
    requiredFixture(document.querySelector(dataSelector('poste-form')), 'form').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    await fixture.whenStable();
  };
  const whenClicking = async (selector: string): Promise<void> => {
    requiredFixture(document.querySelector<HTMLElement>(dataSelector(selector)), selector).click();
    await fixture.whenStable();
  };
  const input = (selector: string): HTMLInputElement =>
    requiredFixture(document.querySelector<HTMLInputElement>(dataSelector(selector)), selector);
  const button = (selector: string): HTMLButtonElement =>
    requiredFixture(document.querySelector<HTMLButtonElement>(dataSelector(selector)), selector);
  const text = (selector: string): string => document.querySelector(dataSelector(selector))?.textContent.trim() ?? '';
});
