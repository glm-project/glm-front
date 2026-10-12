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

  const whenShowingTheDay = async (activites: readonly ActiviteSemee[], jour = 5): Promise<void> => {
    shown = TestBed.createComponent(ActivitesDuJour);
    shown.componentRef.setInput('journee', journeeFixture({ jour, suivis: SUIVIS, activites }));
    await shown.whenStable();
  };

  const hrefs = (selector: string): (string | null)[] =>
    [...(shown.nativeElement as HTMLElement).querySelectorAll(dataSelector(selector))].map(element => element.getAttribute('href'));

  const texts = (selector: string): string[] =>
    [...(shown.nativeElement as HTMLElement).querySelectorAll(dataSelector(selector))].map(element =>
      element.textContent.replace(/\s+/g, ' ').trim(),
    );
});
