import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { Component } from '@angular/core';
import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef, MatDialogState } from '@angular/material/dialog';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { CorrectionsFixture } from '@test/unit/fixtures/gestion/correction-des-activites/CorrectionsFixture';
import {
  ActiviteSemee,
  activiteTerminee,
  elementFixture,
  instantLocal,
  journeeFixture,
  terminee,
  tourFixture,
} from '@test/unit/fixtures/gestion/correction-des-activites/JourneeACorrigerFixture';
import { dataSelector } from '@test/utils/DataSelector';
import { requiredFixture } from '@test/utils/RequiredFixture';
import { firstValueFrom } from 'rxjs';
import { CorrectionDUneActivite, IssueDeCorrection } from '../../../application/CorrectionDUneActivite';
import { CorrectionsPort } from '../../../domain/correction/CorrectionsPort';
import { JourneeACorriger } from '../../../domain/journee/JourneeACorriger';
import { DonneesDuRetrait, RetraitDeLActivite } from './RetraitDeLActivite';

@Component({ template: '' })
class DialogHostFixture {}

const ESCAPE_KEY_CODE = 27;

const SUIVIS = [{ suivi: 'suivi-1', element: elementFixture('1') }];

const soirDuLundi: ActiviteSemee = {
  id: 'soir',
  suivi: 'suivi-1',
  poste: tourFixture,
  debut: instantLocal(5, 18, 30),
  etat: terminee(instantLocal(5, 21, 45), 'PT3H15M'),
};

const nuitDuLundiAuMardi: ActiviteSemee = {
  id: 'nuit',
  suivi: 'suivi-1',
  poste: tourFixture,
  categorie: 'NON_CONFORMITE',
  debut: instantLocal(5, 22),
  etat: terminee(instantLocal(6, 3, 30), 'PT2H'),
  autresJours: [{ jour: 6, duree: 'PT3H30M' }],
};

const journeeDuLundi = journeeFixture({ jour: 5, suivis: SUIVIS, activites: [soirDuLundi, nuitDuLundiAuMardi], operationnelle: 'PT7H30M' });

describe('Confirmation of the removal of an activity', () => {
  let fixture: ComponentFixture<DialogHostFixture>;
  let corrections: CorrectionsFixture;
  let errors: ErrorHandlerFixture;
  let closed: (IssueDeCorrection | undefined)[];
  let fermeture: Promise<IssueDeCorrection | undefined>;
  let dialogue: MatDialogRef<RetraitDeLActivite, IssueDeCorrection>;

  beforeEach(() => {
    corrections = new CorrectionsFixture();
    errors = new ErrorHandlerFixture();
    closed = [];
    TestBed.configureTestingModule({
      providers: [
        { provide: ComponentFixtureAutoDetect, useValue: true },
        { provide: CorrectionsPort, useValue: corrections },
        { provide: ErrorHandlerPort, useValue: errors },
        CorrectionDUneActivite,
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

  it('should name the activity by its hours, show it with its duration, and tell the effect on the day', async () => {
    await whenOpening(journeeDuLundi, 'soir');

    expect(text('retrait-title')).toBe('Retirer l’activité de 18:30 à 21:45 ?');
    expect(texts('retrait-element')).toEqual(['OF 24-131']);
    expect(texts('retrait-designation')).toEqual(['Pièce 1']);
    expect(texts('retrait-poste')).toEqual(['Tour CN 1 · Travail']);
    expect(texts('retrait-duree')).toEqual(['3 h 15']);
    expect(texts('retrait-effet-libelle')).toEqual(['Opérationnel du lundi 5']);
    expect(texts('retrait-effet-valeur')).toEqual(['7 h 30 → 4 h 15']);
    expect(texts('retrait-debordement')).toEqual([]);
  });

  it('should name a crossing activity by its two days, and tell that it is removed on every day it touches', async () => {
    await whenOpening(journeeDuLundi, 'nuit');

    expect(text('retrait-title')).toBe('Retirer l’activité du lundi 5, 22:00, au mardi 6, 03:30 ?');
    expect(texts('retrait-poste')).toEqual(['Tour CN 1 · Non-conformité']);
    expect(texts('retrait-duree')).toEqual(['5 h 30']);
    expect(texts('retrait-effet-libelle')).toEqual(['Opérationnel du lundi 5', 'mardi 6']);
    expect(texts('retrait-effet-valeur')).toEqual(['7 h 30 → 5 h 30', '− 3 h 30']);
    expect(texts('retrait-debordement')).toEqual(['Le retrait vaut pour toute l’activité : le mardi 6 perd aussi 3 h 30.']);
  });

  it('should keep the activity and send nothing when the manager changes his mind', async () => {
    await whenOpening(journeeDuLundi, 'soir');

    await whenClicking('retrait-cancel');
    await whenDismissed();

    expect(corrections.retraits).toEqual([]);
    expect(closed).toEqual([undefined]);
  });

  it('should remove the activity and tell the day must be reread', async () => {
    await whenOpening(journeeDuLundi, 'soir');

    await whenConfirming();
    await whenDismissed();

    expect(corrections.retraits.map(saisie => saisie.activite.value)).toEqual(['soir']);
    expect(closed).toEqual(['ENREGISTREE']);
  });

  it('should tell the day changed when the server says so', async () => {
    corrections.repondre({ kind: 'JOURNEE_CHANGEE' });
    await whenOpening(journeeDuLundi, 'soir');

    await whenConfirming();
    await whenDismissed();

    expect(closed).toEqual(['JOURNEE_CHANGEE']);
  });

  it('should keep the dialog open and say so after a technical failure', async () => {
    corrections.repondre(new Error('Réseau coupé'));
    await whenOpening(journeeDuLundi, 'soir');

    await whenConfirming();

    expect(text('retrait-technical-error')).toBe('Le retrait n’a pas abouti. Vérifiez la connexion puis réessayez.');
    expect(closed).toEqual([]);
  });

  it('should stay open when Escape is pressed while the removal is being sent, then close with the outcome', async () => {
    const arrivee = corrections.retenir();
    await whenOpening(journeeDuLundi, 'soir');
    await whenClicking('retrait-confirm');
    await arrivee;

    await whenPressingEscape();
    const etatApresEchap = dialogue.getState();
    corrections.liberer();
    await whenDismissed();

    expect(etatApresEchap).toBe(MatDialogState.OPEN);
    expect(closed).toEqual(['ENREGISTREE']);
  });

  const whenOpening = async (journee: JourneeACorriger, activite: string): Promise<void> => {
    const data: DonneesDuRetrait = { journee, activite: activiteTerminee(journee, activite) };
    dialogue = TestBed.inject(MatDialog).open<RetraitDeLActivite, DonneesDuRetrait, IssueDeCorrection>(RetraitDeLActivite, { data });
    fermeture = firstValueFrom(dialogue.afterClosed());
    dialogue.afterClosed().subscribe(issue => closed.push(issue));
    await fixture.whenStable();
  };
  const whenConfirming = async (): Promise<void> => {
    await whenClicking('retrait-confirm');
    await whenViewSettles();
  };
  const whenPressingEscape = async (): Promise<void> => {
    const conteneur = requiredFixture(document.querySelector('mat-dialog-container'), 'dialog container');
    const touche = new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true });
    Object.defineProperty(touche, 'keyCode', { value: ESCAPE_KEY_CODE });
    conteneur.dispatchEvent(touche);
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
  const texts = (selector: string): string[] =>
    [...document.querySelectorAll(dataSelector(selector))].map(element => element.textContent.replace(/\s+/g, ' ').trim());
  const text = (selector: string): string => texts(selector)[0] ?? '';
});
