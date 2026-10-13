import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import {
  activiteDeLaJournee,
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
import { FriseDuJour } from './FriseDuJour';

const SUIVIS = [
  { suivi: 'suivi-1', element: elementFixture('1') },
  { suivi: 'suivi-2', element: elementFixture('2', 'MOULE') },
];

const travail = (id: string, debut: [number, number], fin: [number, number], poste = tourFixture, suivi = 'suivi-1'): ActiviteSemee => ({
  id,
  suivi,
  poste,
  debut: instantLocal(5, ...debut),
  etat: terminee(instantLocal(5, ...fin), 'PT1H'),
});

describe('Frise of the day', () => {
  let shown: ComponentFixture<FriseDuJour>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [{ provide: ComponentFixtureAutoDetect, useValue: true }] });
  });

  it('should draw one line per element and workstation, in order of first activity', async () => {
    await whenShowingTheDay(5, [
      { id: 'c', suivi: 'suivi-2', poste: undefined, debut: instantLocal(5, 13), etat: terminee(instantLocal(5, 14), 'PT1H') },
      travail('a', [8, 0], [10, 0]),
      travail('d', [15, 0], [16, 0]),
      travail('b', [11, 0], [12, 0], fraiseuseFixture),
    ]);

    expect(texts('frise-ligne-element')).toEqual(['OF 24-131', 'OF 24-131', 'MOULE 24-132']);
    expect(texts('frise-ligne-poste')).toEqual(['Tour CN 1', 'Fraiseuse 1', 'Sans poste']);
    expect(barresParLigne()).toEqual([2, 1, 1]);
  });

  it('should place a bar and its markers at the real start and end on the axis from 6 h to 22 h', async () => {
    await whenShowingTheDay(5, [travail('a', [8, 0], [10, 0])]);

    expect(barres().map(barre => [barre.style.left, barre.style.width])).toEqual([['12.5%', '12.5%']]);
    expect(marques().map(marque => [marque.dataset['type'], marque.style.left])).toEqual([
      ['debut', '12.5%'],
      ['fin', '25%'],
    ]);
  });

  it('should graduate the axis every two hours from 6 h to 22 h', async () => {
    await whenShowingTheDay(5, [travail('a', [8, 0], [10, 0])]);

    expect(texts('frise-repere')).toEqual(['6 h', '8 h', '10 h', '12 h', '14 h', '16 h', '18 h', '20 h', '22 h']);
  });

  it('should open the axis on the whole day once an activity leaves the hours from 6 h to 22 h', async () => {
    await whenShowingTheDay(5, [travail('a', [23, 0], [23, 30])]);

    expect(texts('frise-repere')).toEqual(['0 h', '3 h', '6 h', '9 h', '12 h', '15 h', '18 h', '21 h', '24 h']);
  });

  it('should cut a bar at midnight, name the day it continues on and put no marker on the cut', async () => {
    await whenShowingTheDay(5, [{ ...travail('a', [22, 0], [23, 0]), etat: terminee(instantLocal(6, 3, 30), 'PT2H') }]);

    expect(barres().map(barre => [barre.dataset['coupeeAuDebut'], barre.dataset['coupeeALaFin']])).toEqual([['false', 'true']]);
    expect(extremite(barres()[0])).toBeCloseTo(100);
    expect(marques().map(marque => marque.dataset['type'])).toEqual(['debut']);
    expect(texts('frise-mention')).toEqual(['suite le mardi 6 →']);
  });

  it('should start a bar at midnight, name the day it began on and put no marker on the cut', async () => {
    await whenShowingTheDay(6, [
      { ...travail('a', [22, 0], [23, 0]), debut: instantLocal(5, 22), etat: terminee(instantLocal(6, 3, 30), 'PT3H30M') },
    ]);

    expect(barres().map(barre => [barre.dataset['coupeeAuDebut'], barre.dataset['coupeeALaFin']])).toEqual([['true', 'false']]);
    expect(barres().map(barre => barre.style.left)).toEqual(['0%']);
    expect(marques().map(marque => marque.dataset['type'])).toEqual(['fin']);
    expect(texts('frise-mention')).toEqual(['← début le lundi 5 à 22:00']);
  });

  it('should show an activity in progress as a point without a bar nor a marker', async () => {
    await whenShowingTheDay(5, [{ id: 'a', suivi: 'suivi-1', poste: tourFixture, debut: instantLocal(5, 14), etat: enCours }]);

    expect(barres().map(barre => [barre.dataset['style'], barre.style.left, barre.style.width])).toEqual([['en-cours', '50%', '']]);
    expect(marques()).toEqual([]);
    expect(texts('frise-barre')).toEqual(['OF 24-131, Tour CN 1, depuis 14:00, travail, en cours']);
  });

  it('should name the day an activity in progress began on when it began before the day', async () => {
    await whenShowingTheDay(5, [{ id: 'a', suivi: 'suivi-1', poste: tourFixture, debut: instantLocal(4, 22), etat: enCours }]);

    expect(barres().map(barre => barre.style.left)).toEqual(['0%']);
    expect(texts('frise-mention')).toEqual(['← en cours depuis dimanche 4 à 22:00']);
    expect(texts('frise-barre')).toEqual(['OF 24-131, Tour CN 1, depuis dimanche 4 à 22:00, travail, en cours']);
  });

  it('should cap the bar of an automatic end and put no marker on an end nobody clocked', async () => {
    await whenShowingTheDay(5, [
      { ...travail('a', [8, 0], [10, 0]), etat: terminee(instantLocal(5, 10), 'PT2H', 'TERMINEE_AUTOMATIQUEMENT') },
    ]);

    expect(barres().map(barre => barre.dataset['automatique'])).toEqual(['true']);
    expect(all('frise-fin-automatique')).toHaveLength(1);
    expect(marques().map(marque => marque.dataset['type'])).toEqual(['debut']);
  });

  it('should cap no bar when the end was clocked', async () => {
    await whenShowingTheDay(5, [travail('a', [8, 0], [10, 0])]);

    expect(barres().map(barre => barre.dataset['automatique'])).toEqual(['false']);
    expect(all('frise-fin-automatique')).toHaveLength(0);
  });

  it('should explain every drawing in its legend', async () => {
    await whenShowingTheDay(5, [travail('a', [8, 0], [10, 0])]);

    expect(texts('frise-legende')).toEqual(['Travail', 'Non-conformité', 'En cours', 'Fin automatique', 'Début', 'Fin']);
  });

  it('should show the operational duration of the day', async () => {
    await whenShowingTheDay(5, [travail('a', [8, 0], [10, 0])], 'PT7H30M');

    expect(texts('frise-operationnel')).toEqual(['Opérationnel : 7 h 30']);
  });

  it('should say there is no activity on an empty day', async () => {
    await whenShowingTheDay(5, []);

    expect(texts('frise-vide')).toEqual(['Aucune activité ce jour']);
  });

  it('should mark the bar of the selected activity only, even when another activity shares its line', async () => {
    const activites = [travail('a', [8, 0], [10, 0]), travail('b', [11, 0], [12, 0]), travail('c', [13, 0], [14, 0], fraiseuseFixture)];
    await whenShowingTheDaySelecting(activites, 'b');

    expect(currents('frise-barre')).toEqual([null, 'true', null]);
  });

  const currents = (selector: string): (string | null)[] => all(selector).map(element => element.getAttribute('aria-current'));

  const whenShowingTheDaySelecting = async (activites: readonly ActiviteSemee[], selection: string): Promise<void> => {
    const journee = journeeFixture({ jour: 5, suivis: SUIVIS, activites });
    shown = TestBed.createComponent(FriseDuJour);
    shown.componentRef.setInput('journee', journee);
    shown.componentRef.setInput('selection', activiteDeLaJournee(journee, selection));
    await shown.whenStable();
  };

  const whenShowingTheDay = async (jour: number, activites: readonly ActiviteSemee[], operationnelle = 'PT0S'): Promise<void> => {
    shown = TestBed.createComponent(FriseDuJour);
    shown.componentRef.setInput('journee', journeeFixture({ jour, suivis: SUIVIS, activites, operationnelle }));
    await shown.whenStable();
  };

  const all = (selector: string): HTMLElement[] => [
    ...(shown.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(dataSelector(selector)),
  ];
  const extremite = (barre: HTMLElement | undefined): number => parseFloat(barre?.style.left ?? '') + parseFloat(barre?.style.width ?? '');
  const barresParLigne = (): number[] => all('frise-ligne').map(ligne => ligne.querySelectorAll(dataSelector('frise-barre')).length);
  const barres = (): HTMLElement[] => all('frise-barre');
  const marques = (): HTMLElement[] => all('frise-marque');
  const texts = (selector: string): string[] => all(selector).map(element => element.textContent.replace(/\s+/g, ' ').trim());
});
