import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  ActiviteSemee,
  elementFixture,
  enCours,
  fraiseuseFixture,
  instantLocal,
  journeeFixture,
  terminee,
  tourFixture,
} from '@test/unit/fixtures/gestion/correction-des-activites/JourneeACorrigerFixture';
import { dataSelector } from '@test/utils/DataSelector';
import { ActiviteTerminee } from '../../../domain/journee/ActiviteDeLaJournee';
import { ActiviteDeLaJourneeId } from '../../../domain/journee/ActiviteDeLaJourneeId';
import { ActivitesDuJour } from './ActivitesDuJour';

const SUIVIS = [
  { suivi: 'suivi-1', element: elementFixture('1') },
  { suivi: 'suivi-2', element: elementFixture('2', 'MOULE'), clotureLe: instantLocal(5, 11) },
];

const matin: ActiviteSemee = {
  id: 'matin',
  suivi: 'suivi-1',
  poste: tourFixture,
  debut: instantLocal(5, 8),
  etat: terminee(instantLocal(5, 9, 30), 'PT1H30M'),
};

const lundiSoir: ActiviteSemee = {
  id: 'nuit',
  suivi: 'suivi-1',
  poste: tourFixture,
  debut: instantLocal(5, 22),
  etat: terminee(instantLocal(6, 3, 30), 'PT2H'),
  autresJours: [{ jour: 6, duree: 'PT3H30M' }],
};

const lundiSoirVuLeMardi: ActiviteSemee = {
  ...lundiSoir,
  etat: terminee(instantLocal(6, 3, 30), 'PT3H30M'),
  autresJours: [{ jour: 5, duree: 'PT2H' }],
};

const lundiSoirAuxSecondes: ActiviteSemee = {
  ...lundiSoir,
  etat: terminee(instantLocal(6, 3, 30), 'PT1H59M30S'),
  autresJours: [{ jour: 6, duree: 'PT3H30M45S' }],
};

const soir: ActiviteSemee = {
  id: 'soir',
  suivi: 'suivi-1',
  poste: fraiseuseFixture,
  categorie: 'NON_CONFORMITE',
  debut: instantLocal(5, 18, 30),
  etat: terminee(instantLocal(5, 21, 45), 'PT3H15M'),
};

const enCoursDepuis14h: ActiviteSemee = { id: 'en-cours', suivi: 'suivi-1', debut: instantLocal(5, 14), etat: enCours };

const enCoursDepuisLundiSoir: ActiviteSemee = { id: 'en-cours-depuis-hier', suivi: 'suivi-1', debut: instantLocal(5, 22), etat: enCours };

const enCoursSurLeSuiviCloture: ActiviteSemee = { id: 'en-cours-cloture', suivi: 'suivi-2', debut: instantLocal(5, 14), etat: enCours };

const finAutomatique: ActiviteSemee = {
  ...soir,
  etat: terminee(instantLocal(5, 21, 45), 'PT3H15M', 'TERMINEE_AUTOMATIQUEMENT'),
};

const suiviCloture: ActiviteSemee = {
  id: 'cloturee',
  suivi: 'suivi-2',
  debut: instantLocal(5, 10),
  etat: terminee(instantLocal(5, 10, 30), 'PT30M'),
};

describe('Activities of the day', () => {
  let shown: ComponentFixture<ActivitesDuJour>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [{ provide: ComponentFixtureAutoDetect, useValue: true }, provideRouter([])] });
    shown = TestBed.createComponent(ActivitesDuJour);
  });

  it('should list the activities in chronological order with their hours, element, workstation, type and duration', async () => {
    await whenShowingTheDay([soir, matin]);

    expect(texts('activite-horaires')).toEqual(['08:00 → 09:30', '18:30 → 21:45']);
    expect(texts('activite-element')).toEqual(['OF 24-131 Pièce 1', 'OF 24-131 Pièce 1']);
    expect(texts('activite-poste')).toEqual(['Tour CN 1', 'Fraiseuse 1']);
    expect(texts('activite-type')).toEqual(['Travail', 'Non-conformité']);
    expect(texts('activite-duree')).toEqual(['1 h 30', '3 h 15']);
  });

  it('should open the day an activity ends on from a crossing activity, with its duration on this day and in all', async () => {
    await whenShowingTheDay([lundiSoir]);

    expect(texts('activite-duree')).toEqual(['2 h 00']);
    expect(texts('activite-total')).toEqual(['sur 5 h 30']);
    expect(texts('activite-lien-fin')).toEqual(['fin le mardi 6']);
    expect(hrefs('activite-lien-fin')).toEqual(['/operateurs/op-1/journees/2026-10-06']);
    expect(texts('activite-lien-debut')).toEqual([]);
  });

  it('should add the seconds of the portions before showing the total of a crossing activity', async () => {
    await whenShowingTheDay([lundiSoirAuxSecondes]);

    expect(texts('activite-duree')).toEqual(['1 h 59']);
    expect(texts('activite-total')).toEqual(['sur 5 h 30']);
  });

  it('should open the day an activity began on from a crossing activity seen on its second day', async () => {
    await whenShowingTheDay([lundiSoirVuLeMardi], 6);

    expect(texts('activite-duree')).toEqual(['3 h 30']);
    expect(texts('activite-total')).toEqual(['sur 5 h 30']);
    expect(texts('activite-lien-debut')).toEqual(['début le lundi 5']);
    expect(hrefs('activite-lien-debut')).toEqual(['/operateurs/op-1/journees/2026-10-05']);
    expect(texts('activite-lien-fin')).toEqual([]);
  });

  it('should show no total and no link for an activity contained in the day', async () => {
    await whenShowingTheDay([matin]);

    expect(texts('activite-total')).toEqual([]);
    expect(texts('activite-lien-debut')).toEqual([]);
    expect(texts('activite-lien-fin')).toEqual([]);
  });

  it('should say an activity is in progress, with neither duration nor total', async () => {
    await whenShowingTheDay([enCoursDepuis14h]);

    expect(texts('activite-horaires')).toEqual(['depuis 14:00']);
    expect(texts('activite-etat')).toEqual(['en cours']);
    expect(texts('activite-duree')).toEqual([]);
    expect(texts('activite-total')).toEqual([]);
  });

  it('should name the day an activity in progress began on when it began before the day', async () => {
    await whenShowingTheDay([enCoursDepuisLundiSoir], 6);

    expect(texts('activite-horaires')).toEqual(['depuis lundi 5 à 22:00']);
    expect(texts('activite-etat')).toEqual(['en cours']);
  });

  it('should say an activity ended automatically while keeping its duration', async () => {
    await whenShowingTheDay([finAutomatique]);

    expect(texts('activite-etat')).toEqual(['fin automatique']);
    expect(texts('activite-duree')).toEqual(['3 h 15']);
  });

  it('should say when the suivi of a finished activity is closed', async () => {
    await whenShowingTheDay([suiviCloture]);

    expect(texts('activite-cloture')).toEqual(['Clôturé le lundi 5 à 11:00']);
  });

  it('should say nothing of closing for an activity whose suivi is open', async () => {
    await whenShowingTheDay([matin]);

    expect(texts('activite-cloture')).toEqual([]);
  });

  it('should say nothing of closing for an activity in progress, whatever its suivi', async () => {
    await whenShowingTheDay([enCoursSurLeSuiviCloture]);

    expect(texts('activite-cloture')).toEqual([]);
  });

  it('should count the activities in its title', async () => {
    await whenShowingTheDay([matin, soir]);

    expect(texts('activites-titre')).toEqual(['Activités du jour · 2']);
  });

  it('should say when an activity was clocked without a workstation', async () => {
    await whenShowingTheDay([{ ...matin, poste: undefined }]);

    expect(texts('activite-poste')).toEqual(['Sans poste']);
  });

  it('should say there is no activity on an empty day', async () => {
    await whenShowingTheDay([]);

    expect(texts('activites-vide')).toEqual(['Aucune activité ce jour']);
  });

  it.each([
    { cas: 'finished normally', activite: matin, nom: 'Retirer l’activité OF 24-131, 08:00 → 09:30' },
    { cas: 'ended automatically', activite: finAutomatique, nom: 'Retirer l’activité OF 24-131, 18:30 → 21:45' },
  ])('should offer to remove an activity $cas, named by its element and its hours', async ({ activite, nom }) => {
    await whenShowingTheDay([activite]);

    expect(labels('activite-retirer')).toEqual([nom]);
  });

  it('should offer no removal for an activity in progress nor for an activity whose suivi is closed', async () => {
    await whenShowingTheDay([enCoursDepuis14h, suiviCloture]);

    expect(labels('activite-retirer')).toEqual([]);
  });

  it('should ask to remove the activity whose button is pressed', async () => {
    const demandes = givenTheRemovalsAsked();
    await whenShowingTheDay([matin, soir]);

    whenPressingTheRemovalOfTheSecondActivity();

    expect(demandes.map(demande => demande.id.value)).toEqual(['soir']);
  });

  it.each([
    { cas: 'finished normally', activite: matin, nom: 'Changer le poste de l’activité OF 24-131, 08:00 → 09:30' },
    { cas: 'ended automatically', activite: finAutomatique, nom: 'Changer le poste de l’activité OF 24-131, 18:30 → 21:45' },
  ])('should offer to change the workstation of an activity $cas, named by its element and its hours', async ({ activite, nom }) => {
    await whenShowingTheDay([activite]);

    expect(labels('activite-changer-poste')).toEqual([nom]);
  });

  it('should offer no change of workstation for an activity in progress nor for an activity whose suivi is closed', async () => {
    await whenShowingTheDay([enCoursDepuis14h, suiviCloture]);

    expect(labels('activite-changer-poste')).toEqual([]);
  });

  it('should ask to change the workstation of the activity whose button is pressed', async () => {
    const demandes = givenTheChangesOfWorkstationAsked();
    await whenShowingTheDay([matin, soir]);

    whenPressingTheChangeOfWorkstationOfTheSecondActivity();

    expect(demandes.map(demande => demande.id.value)).toEqual(['soir']);
  });

  it('should mark the selected activity as the current one in the list', async () => {
    await whenShowingTheDayWithTheSelection([matin, soir], 'soir');

    expect(currents('activite')).toEqual([null, 'true']);
  });

  it('should give the focus back to the button that changes the workstation of an activity', async () => {
    await whenShowingTheDay([matin, soir]);

    shown.componentInstance.donnerLeFocusAuChangementDePoste(new ActiviteDeLaJourneeId('soir'));

    expect(document.activeElement).toBe(all('activite-changer-poste')[1]);
  });

  it('should give the focus to nothing when the activity offers no change of workstation', async () => {
    await whenShowingTheDay([enCoursDepuis14h]);

    shown.componentInstance.donnerLeFocusAuChangementDePoste(new ActiviteDeLaJourneeId('en-cours'));

    expect(document.activeElement).toBe(document.body);
  });

  it('should forbid every correction while one is being sent', async () => {
    shown.componentRef.setInput('envoiEnCours', true);
    await whenShowingTheDay([matin, soir]);

    expect(disabledStates('activite-changer-poste')).toEqual([true, true]);
    expect(disabledStates('activite-retirer')).toEqual([true, true]);
  });

  it('should allow the corrections when none is being sent', async () => {
    await whenShowingTheDay([matin, soir]);

    expect(disabledStates('activite-changer-poste')).toEqual([false, false]);
    expect(disabledStates('activite-retirer')).toEqual([false, false]);
  });

  it('should offer to add an activity, even on an empty day', async () => {
    await whenShowingTheDay([]);

    expect(texts('activite-ajouter')).toEqual(['Ajouter une activité']);
  });

  it('should ask to add an activity when its button is pressed', async () => {
    const demandes = givenTheAdditionsAsked();
    await whenShowingTheDay([matin]);

    whenPressingTheAddition();

    expect(demandes).toEqual([undefined]);
  });

  it('should forbid the addition while a correction is being sent', async () => {
    shown.componentRef.setInput('envoiEnCours', true);
    await whenShowingTheDay([matin]);

    expect(disabledStates('activite-ajouter')).toEqual([true]);
  });

  it.each([
    { ouvert: false, attendu: 'false' },
    { ouvert: true, attendu: 'true' },
  ])('should say whether the panel of the addition is open, which is $ouvert', async ({ ouvert, attendu }) => {
    shown.componentRef.setInput('ajoutOuvert', ouvert);
    await whenShowingTheDay([matin]);

    expect(expansions('activite-ajouter')).toEqual([attendu]);
  });

  it('should give the focus back to the button that adds an activity', async () => {
    await whenShowingTheDay([matin]);

    shown.componentInstance.donnerLeFocusAuBoutonDAjout();

    expect(document.activeElement).toBe(all('activite-ajouter')[0]);
  });

  const expansions = (selector: string): (string | null)[] => all(selector).map(element => element.getAttribute('aria-expanded'));

  const givenTheAdditionsAsked = (): undefined[] => {
    const demandes: undefined[] = [];
    shown.componentInstance.ajoutDemande.subscribe(() => demandes.push(undefined));
    return demandes;
  };

  const whenPressingTheAddition = (): void => {
    all('activite-ajouter')[0]?.click();
  };

  const disabledStates = (selector: string): boolean[] => all(selector).map(element => (element as HTMLButtonElement).disabled);

  const givenTheChangesOfWorkstationAsked = (): ActiviteTerminee[] => {
    const demandes: ActiviteTerminee[] = [];
    shown.componentInstance.changementDePosteDemande.subscribe(activite => demandes.push(activite));
    return demandes;
  };

  const whenPressingTheChangeOfWorkstationOfTheSecondActivity = (): void => {
    all('activite-changer-poste')[1]?.click();
  };

  const whenShowingTheDayWithTheSelection = async (activites: readonly ActiviteSemee[], selection: string): Promise<void> => {
    shown.componentRef.setInput('selection', new ActiviteDeLaJourneeId(selection));
    await whenShowingTheDay(activites);
  };

  const all = (selector: string): HTMLElement[] => [
    ...(shown.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(dataSelector(selector)),
  ];

  const currents = (selector: string): (string | null)[] => all(selector).map(element => element.getAttribute('aria-current'));

  const givenTheRemovalsAsked = (): ActiviteTerminee[] => {
    const demandes: ActiviteTerminee[] = [];
    shown.componentInstance.retraitDemande.subscribe(activite => demandes.push(activite));
    return demandes;
  };

  const whenPressingTheRemovalOfTheSecondActivity = (): void => {
    const boutons = (shown.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(dataSelector('activite-retirer'));
    boutons[1]?.click();
  };

  const whenShowingTheDay = async (activites: readonly ActiviteSemee[], jour = 5): Promise<void> => {
    shown.componentRef.setInput('journee', journeeFixture({ jour, suivis: SUIVIS, activites }));
    await shown.whenStable();
  };

  const hrefs = (selector: string): (string | null)[] =>
    [...(shown.nativeElement as HTMLElement).querySelectorAll(dataSelector(selector))].map(element => element.getAttribute('href'));

  const labels = (selector: string): (string | null)[] =>
    [...(shown.nativeElement as HTMLElement).querySelectorAll(dataSelector(selector))].map(element => element.getAttribute('aria-label'));

  const texts = (selector: string): string[] =>
    [...(shown.nativeElement as HTMLElement).querySelectorAll(dataSelector(selector))].map(element =>
      element.textContent.replace(/\s+/g, ' ').trim(),
    );
});
