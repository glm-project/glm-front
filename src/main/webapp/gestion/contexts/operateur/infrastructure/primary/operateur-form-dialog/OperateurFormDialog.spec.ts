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
import { IdentiteDejaUtilisee } from '../../../domain/IdentiteDejaUtilisee';
import { Matricule } from '../../../domain/Matricule';
import { MatriculeDejaUtilise } from '../../../domain/MatriculeDejaUtilise';
import { NomOperateur } from '../../../domain/NomOperateur';
import { Operateur } from '../../../domain/Operateur';
import { OperateurId } from '../../../domain/OperateurId';
import { OperateurIntrouvable } from '../../../domain/OperateurIntrouvable';
import { OperateursPort } from '../../../domain/OperateursPort';
import { PosteHabilitable } from '../../../domain/PosteHabilitable';
import { PosteHabilitableId } from '../../../domain/PosteHabilitableId';
import { PrenomOperateur } from '../../../domain/PrenomOperateur';
import { RefusCreationOperateur } from '../../../domain/RefusCreationOperateur';
import { TauxHoraire } from '../../../domain/TauxHoraire';
import { OperateurFormDialog, OperateurFormDialogData } from './OperateurFormDialog';

@Component({ template: '' })
class DialogHostFixture {}

const tourFixture = new PosteHabilitable(new PosteHabilitableId('tour-1'), { libelle: 'Tour 1', nature: 'tournage' });
const scieFixture = new PosteHabilitable(new PosteHabilitableId('scie-1'), { libelle: 'Scie 1', nature: 'sciage' });

const jeanFixture = new Operateur(new OperateurId('jean'), {
  nom: new NomOperateur('Dupont'),
  prenom: new PrenomOperateur('Jean'),
  matricule: new Matricule('049'),
  tauxHoraire: new TauxHoraire(22),
  postes: [tourFixture],
  natures: ['tournage'],
});

describe('OperateurFormDialog', () => {
  let fixture: ComponentFixture<DialogHostFixture>;
  let port: OperateursFixture;
  let errors: ErrorHandlerFixture;
  let dialog: MatDialogRef<OperateurFormDialog, boolean>;
  let closed: (boolean | undefined)[];
  let fermeture: Promise<boolean | undefined>;

  beforeEach(() => {
    port = new OperateursFixture();
    port.catalogue = [tourFixture, scieFixture];
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

  it('should display domain validation and keep the dialog open when entries are invalid', async () => {
    await whenOpening();
    await whenSubmitting();

    expect(text('operateur-nom-error')).toContain('Le nom est obligatoire');
    expect(text('operateur-prenom-error')).toContain('Le prénom est obligatoire');
    expect(port.enregistrements).toEqual([]);
    expect(closed).toEqual([]);
  });

  it('should declare an operator from the entered values and close after success', async () => {
    await whenOpening();
    await whenFillingIdentity();
    await whenEntering('operateur-matricule', '049');
    await whenEntering('operateur-taux', '22,5');
    await whenSubmitting();
    await whenClosed();

    expect(port.enregistrements).toEqual([
      {
        type: 'CREATION',
        nom: new NomOperateur('Dupont'),
        prenom: new PrenomOperateur('Jean'),
        matricule: new Matricule('049'),
        tauxHoraire: new TauxHoraire(22.5),
        postes: [],
      },
    ]);
    expect(closed).toEqual([true]);
  });

  it('should prefill and revise an existing operator, dropping its blank optional entries', async () => {
    await whenOpening(jeanFixture);
    const initialMatricule = input('operateur-matricule').value;
    await whenEntering('operateur-nom', 'Durand');
    await whenEntering('operateur-matricule', '');
    await whenEntering('operateur-taux', '');
    await whenSubmitting();
    await whenClosed();

    expect(initialMatricule).toBe('049');
    expect(port.enregistrements).toEqual([
      {
        type: 'MODIFICATION',
        id: jeanFixture.id,
        nom: new NomOperateur('Durand'),
        prenom: new PrenomOperateur('Jean'),
        matricule: undefined,
        tauxHoraire: undefined,
        postes: [tourFixture.id],
      },
    ]);
  });

  it('should suggest workstations matching the search on label or trade', async () => {
    await whenOpening();
    await whenEntering('operateur-poste-recherche', 'sci');

    expect(texts('operateur-poste-option')).toEqual(['Scie 1 — sciage']);
  });

  it('should grant a chosen habilitation and clear the search', async () => {
    await whenOpening();
    await whenEntering('operateur-poste-recherche', 'tour');
    await whenClicking('operateur-poste-option');

    expect(texts('operateur-poste-chip')).toEqual([expect.stringContaining('Tour 1')]);
    expect(input('operateur-poste-recherche').value).toBe('');
  });

  it('should stop suggesting a habilitation that is already granted', async () => {
    await whenOpening();
    await whenEntering('operateur-poste-recherche', 'tour');
    await whenClicking('operateur-poste-option');
    await whenEntering('operateur-poste-recherche', 'tour');

    expect(texts('operateur-poste-option')).toEqual([]);
  });

  it('should send the granted habilitations with the declaration', async () => {
    await whenOpening();
    await whenFillingIdentity();
    await whenEntering('operateur-poste-recherche', 'tour');
    await whenClicking('operateur-poste-option');
    await whenSubmitting();
    await whenClosed();

    expect(port.enregistrements).toEqual([expect.objectContaining({ postes: [tourFixture.id] })]);
  });

  it('should withdraw a habilitation from the chips', async () => {
    await whenOpening(jeanFixture);
    await whenClicking('operateur-poste-remove');

    expect(texts('operateur-poste-chip')).toEqual([]);
  });

  it('should show a duplicate identity refusal until the manager changes the family name', async () => {
    givenDuplicateIdentityIsRefused();
    await whenOpening();
    await whenFillingIdentity();
    await whenSubmitting();
    const duplicate = text('operateur-nom-error');
    const remainedOpen = closed.length;
    await whenEntering('operateur-nom', 'Durand');

    expect(duplicate).toContain('Un autre opérateur porte déjà ce nom et ce prénom.');
    expect(remainedOpen).toBe(0);
    expect(text('operateur-nom-error')).toBe('');
  });

  it('should show a duplicate payroll number refusal on its own field', async () => {
    givenDuplicatePayrollNumberIsRefused();
    await whenOpening();
    await whenFillingIdentity();
    await whenEntering('operateur-matricule', '049');
    await whenSubmitting();

    expect(text('operateur-matricule-error')).toContain('Un autre opérateur porte déjà ce matricule.');
    expect(closed).toEqual([]);
  });

  it('should report a vanished operator as a saving failure', async () => {
    givenOperateurIsMissing();
    await whenOpening(jeanFixture);
    await whenSubmitting();

    expect(text('operateur-enregistrement-error')).toContain('Cet opérateur n’existe plus.');
    expect(closed).toEqual([]);
  });

  it('should report a technical failure and let the manager retry', async () => {
    givenSavingFails();
    await whenOpening();
    await whenFillingIdentity();
    await whenSubmitting();

    expect(text('operateur-technical-error')).toContain('L’enregistrement a échoué.');
    expect(errors.errors).toHaveLength(1);
    expect(closed).toEqual([]);
  });

  it('should keep the form busy and ignore a second submission until the write completes', async () => {
    const deferred = new DeferredFixture<Result<void, RefusCreationOperateur>>();
    givenSavingIsPending(deferred);
    await whenOpening();
    await whenFillingIdentity();
    await whenSubmitting();
    const busy = button('operateur-save').disabled;
    await whenSubmitting();
    deferred.resolve({ ok: true, value: undefined });
    await whenClosed();

    expect(busy).toBe(true);
    expect(port.enregistrements).toHaveLength(1);
    expect(closed).toEqual([true]);
  });

  it('should cancel without writing', async () => {
    await whenOpening();
    await whenClicking('operateur-cancel');
    await whenClosed();

    expect(port.enregistrements).toEqual([]);
    expect(closed).toEqual([false]);
  });

  const givenDuplicateIdentityIsRefused = (): void => {
    port.creation = err(new IdentiteDejaUtilisee());
  };
  const givenDuplicatePayrollNumberIsRefused = (): void => {
    port.creation = err(new MatriculeDejaUtilise());
  };
  const givenOperateurIsMissing = (): void => {
    port.modification = err(new OperateurIntrouvable());
  };
  const givenSavingFails = (): void => {
    port.ecritureFailure = new Error('Network down');
  };
  const givenSavingIsPending = (deferred: DeferredFixture<Result<void, RefusCreationOperateur>>): void => {
    port.creationDifferee = deferred.promise;
  };

  const whenOpening = async (operateur: Operateur | null = null): Promise<void> => {
    dialog = TestBed.inject(MatDialog).open<OperateurFormDialog, OperateurFormDialogData, boolean>(OperateurFormDialog, {
      data: { operateur },
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
  const whenFillingIdentity = async (): Promise<void> => {
    await whenEntering('operateur-nom', 'Dupont');
    await whenEntering('operateur-prenom', 'Jean');
  };
  const whenSubmitting = async (): Promise<void> => {
    requiredFixture(document.querySelector(dataSelector('operateur-form')), 'form').dispatchEvent(
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
  const texts = (selector: string): string[] =>
    [...document.querySelectorAll(dataSelector(selector))].map(element => element.textContent.trim());
});
