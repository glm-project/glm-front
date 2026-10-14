import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { CorrectionsFixture } from '@test/unit/fixtures/gestion/correction-des-activites/CorrectionsFixture';
import {
  ActiviteSemee,
  activiteTerminee,
  elementFixture,
  fraiseuseFixture,
  instantLocal,
  journeeFixture,
  terminee,
  tourFixture,
} from '@test/unit/fixtures/gestion/correction-des-activites/JourneeACorrigerFixture';
import { dataSelector } from '@test/utils/DataSelector';
import { requiredFixture } from '@test/utils/RequiredFixture';
import { CorrectionDUneActivite, IssueDeCorrection } from '../../../application/CorrectionDUneActivite';
import { CorrectionsPort } from '../../../domain/correction/CorrectionsPort';
import { PosteDeLaJournee } from '../../../domain/journee/PosteDeLaJournee';
import { PosteDeLaJourneeId } from '../../../domain/journee/PosteDeLaJourneeId';
import { PanneauDeChangementDePoste } from './PanneauDeChangementDePoste';

const perceuseFixture = new PosteDeLaJournee(new PosteDeLaJourneeId('poste-perce'), 'Perceuse 1', 'Perçage');

const SUIVIS = [{ suivi: 'suivi-1', element: elementFixture('1') }];

const soirSurLeTour: ActiviteSemee = {
  id: 'soir',
  suivi: 'suivi-1',
  poste: tourFixture,
  debut: instantLocal(5, 18, 30),
  etat: terminee(instantLocal(5, 21, 45), 'PT3H15M'),
};

const nuitSurLeTour: ActiviteSemee = {
  id: 'nuit',
  suivi: 'suivi-1',
  poste: tourFixture,
  debut: instantLocal(5, 22),
  etat: terminee(instantLocal(6, 3, 30), 'PT2H'),
  autresJours: [{ jour: 6, duree: 'PT3H30M' }],
};

const sansPoste: ActiviteSemee = { ...soirSurLeTour, id: 'sans-poste', poste: undefined };

const journeeAvec = (activite: ActiviteSemee, postes: readonly PosteDeLaJournee[]) =>
  journeeFixture({ jour: 5, suivis: SUIVIS, activites: [activite], postes });

describe('Panel to change the workstation of an activity', () => {
  let shown: ComponentFixture<PanneauDeChangementDePoste>;
  let corrections: CorrectionsFixture;
  let corrigees: IssueDeCorrection[];
  let abandons: number;

  beforeEach(() => {
    corrections = new CorrectionsFixture();
    corrigees = [];
    abandons = 0;
    TestBed.configureTestingModule({
      providers: [
        { provide: ComponentFixtureAutoDetect, useValue: true },
        { provide: CorrectionsPort, useValue: corrections },
        { provide: ErrorHandlerPort, useClass: ErrorHandlerFixture },
        CorrectionDUneActivite,
      ],
    });
  });

  afterEach(() => {
    corrections.liberer();
  });

  it('should recall the activity by its element, its designation and its hours', async () => {
    await whenOpeningFor(soirSurLeTour, [tourFixture, fraiseuseFixture]);

    expect(text('changement-titre')).toBe('Changer le poste');
    expect(text('changement-element')).toBe('OF 24-131');
    expect(text('changement-designation')).toBe('Pièce 1');
    expect(text('changement-horaires')).toBe('18:30 → 21:45');
  });

  it('should recall a crossing activity by its two days', async () => {
    await whenOpeningFor(nuitSurLeTour, [tourFixture, fraiseuseFixture]);

    expect(text('changement-horaires')).toBe('Du lundi 5, 22:00, au mardi 6, 03:30');
  });

  it('should offer the workstations the operator is allowed on with their nature, the current one shown but disabled', async () => {
    await whenOpeningFor(soirSurLeTour, [tourFixture, fraiseuseFixture, perceuseFixture]);

    expect(optionTexts()).toEqual(['Tour CN 1 · Tournage', 'Fraiseuse 1 · Fraisage', 'Perceuse 1 · Perçage']);
    expect(optionDisabled()).toEqual([true, false, false]);
    expect(text('changement-etait')).toBe('Était : Tour CN 1 · Tournage');
  });

  it('should say the activity was clocked without a workstation and offer every workstation allowed', async () => {
    await whenOpeningFor(sansPoste, [tourFixture, fraiseuseFixture]);

    expect(optionTexts()).toEqual(['Tour CN 1 · Tournage', 'Fraiseuse 1 · Fraisage']);
    expect(text('changement-etait')).toBe('Était : Sans poste');
  });

  it('should say the time does not change', async () => {
    await whenOpeningFor(soirSurLeTour, [tourFixture, fraiseuseFixture]);

    expect(text('changement-effet')).toBe('Le temps ne change pas');
  });

  it('should move the focus to the field when it opens', async () => {
    await whenOpeningFor(soirSurLeTour, [tourFixture, fraiseuseFixture]);

    expect(document.activeElement).toBe(all('changement-poste')[0]);
  });

  it('should say there is no other workstation and offer nothing to save when the operator is allowed on the current one only', async () => {
    await whenOpeningFor(soirSurLeTour, [tourFixture]);

    expect(text('changement-aucun-poste')).toBe('Aucun autre poste habilité pour cet opérateur.');
    expect(all('changement-poste')).toEqual([]);
    expect(all('changement-enregistrer')).toEqual([]);
    expect(text('changement-etait')).toBe('Était : Tour CN 1 · Tournage');
  });

  it('should move the focus to the abandon button when there is no field', async () => {
    await whenOpeningFor(soirSurLeTour, [tourFixture]);

    expect(document.activeElement).toBe(all('changement-abandonner')[0]);
  });

  it('should send the change to the first other workstation and tell the day must be reread', async () => {
    await whenOpeningFor(soirSurLeTour, [tourFixture, fraiseuseFixture, perceuseFixture]);

    await whenSaving();

    expect(corrections.changements.map(saisie => [saisie.activite.value, saisie.poste.value])).toEqual([['soir', 'poste-fraise']]);
    expect(corrigees).toEqual(['ENREGISTREE']);
  });

  it('should send the change to the workstation chosen', async () => {
    await whenOpeningFor(soirSurLeTour, [tourFixture, fraiseuseFixture, perceuseFixture]);
    await whenChoosing('poste-perce');

    await whenSaving();

    expect(corrections.changements.map(saisie => saisie.poste.value)).toEqual(['poste-perce']);
  });

  it('should tell the day changed when the server says so', async () => {
    corrections.repondreAuChangement({ kind: 'JOURNEE_CHANGEE' });
    await whenOpeningFor(soirSurLeTour, [tourFixture, fraiseuseFixture]);

    await whenSaving();

    expect(corrigees).toEqual(['JOURNEE_CHANGEE']);
  });

  it('should explain the refusal under the buttons and keep the entry', async () => {
    corrections.repondreAuChangement({ kind: 'REFUS', motif: 'CHEVAUCHEMENT' });
    await whenOpeningFor(soirSurLeTour, [tourFixture, fraiseuseFixture]);

    await whenSaving();

    expect(text('changement-refus')).toBe('Une autre activité de cet élément se chevauche déjà sur ce poste.');
    expect(corrigees).toEqual([]);
    expect(optionTexts()).toEqual(['Tour CN 1 · Tournage', 'Fraiseuse 1 · Fraisage']);
  });

  it('should keep the workstation chosen when the server refuses the change', async () => {
    corrections.repondreAuChangement({ kind: 'REFUS', motif: 'CHEVAUCHEMENT' });
    await whenOpeningFor(soirSurLeTour, [tourFixture, fraiseuseFixture, perceuseFixture]);
    await whenChoosing('poste-perce');

    await whenSaving();

    expect(chosenWorkstation()).toBe('poste-perce');
  });

  it('should forget its entry when it is closed without an outcome, so that the same change sent later is a new command', async () => {
    corrections.repondreAuChangement({ kind: 'REFUS', motif: 'CHEVAUCHEMENT' });
    await whenOpeningFor(soirSurLeTour, [tourFixture, fraiseuseFixture]);
    await whenSaving();
    shown.destroy();
    await whenOpeningFor(soirSurLeTour, [tourFixture, fraiseuseFixture]);

    await whenSaving();

    expect(new Set(corrections.changements.map(saisie => saisie.id)).size).toBe(2);
  });

  it('should say the change failed and keep the entry after a technical failure', async () => {
    corrections.repondreAuChangement(new Error('Réseau coupé'));
    await whenOpeningFor(soirSurLeTour, [tourFixture, fraiseuseFixture]);

    await whenSaving();

    expect(text('changement-echec')).toBe('Le changement de poste n’a pas abouti. Vérifiez la connexion puis réessayez.');
    expect(corrigees).toEqual([]);
  });

  it('should abandon without sending anything', async () => {
    await whenOpeningFor(soirSurLeTour, [tourFixture, fraiseuseFixture]);

    whenAbandoning();

    expect(corrections.changements).toEqual([]);
    expect(abandons).toBe(1);
  });

  it('should show the change being sent and forbid saving or abandoning meanwhile', async () => {
    const arrivee = corrections.retenir();
    await whenOpeningFor(soirSurLeTour, [tourFixture, fraiseuseFixture]);

    whenSavingWithoutWaiting();
    await arrivee;
    await shown.whenStable();

    expect(text('changement-enregistrer')).toBe('Enregistrement…');
    expect(all('changement-enregistrer').map(bouton => (bouton as HTMLButtonElement).disabled)).toEqual([true]);
    expect(all('changement-abandonner').map(bouton => (bouton as HTMLButtonElement).disabled)).toEqual([true]);
  });

  const whenOpeningFor = async (activite: ActiviteSemee, postes: readonly PosteDeLaJournee[]): Promise<void> => {
    const journee = journeeAvec(activite, postes);
    shown = TestBed.createComponent(PanneauDeChangementDePoste);
    shown.componentRef.setInput('journee', journee);
    shown.componentRef.setInput('activite', activiteTerminee(journee, activite.id));
    shown.componentInstance.corrigee.subscribe(issue => corrigees.push(issue));
    shown.componentInstance.abandon.subscribe(() => {
      abandons += 1;
    });
    await shown.whenStable();
  };

  const whenSaving = async (): Promise<void> => {
    whenSavingWithoutWaiting();
    await new Promise(resolve => setTimeout(resolve));
    await shown.whenStable();
  };

  const whenSavingWithoutWaiting = (): void => {
    requiredFixture(all('changement-enregistrer')[0], 'changement-enregistrer').click();
  };

  const whenChoosing = async (poste: string): Promise<void> => {
    const champ = requiredFixture(all('changement-poste')[0], 'changement-poste') as HTMLSelectElement;
    champ.value = poste;
    champ.dispatchEvent(new Event('change'));
    await shown.whenStable();
  };

  const whenAbandoning = (): void => {
    requiredFixture(all('changement-abandonner')[0], 'changement-abandonner').click();
  };

  const all = (selector: string): HTMLElement[] => [
    ...(shown.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(dataSelector(selector)),
  ];
  const text = (selector: string): string => all(selector)[0]?.textContent.replace(/\s+/g, ' ').trim() ?? '';
  const chosenWorkstation = (): string => (requiredFixture(all('changement-poste')[0], 'changement-poste') as HTMLSelectElement).value;
  const optionTexts = (): string[] =>
    [...(shown.nativeElement as HTMLElement).querySelectorAll('option')].map(option => option.textContent.trim());
  const optionDisabled = (): boolean[] =>
    [...(shown.nativeElement as HTMLElement).querySelectorAll('option')].map(option => option.disabled);
});
