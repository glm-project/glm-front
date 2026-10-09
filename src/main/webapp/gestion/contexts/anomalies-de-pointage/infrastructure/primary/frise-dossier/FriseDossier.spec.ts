import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResizeObserverFixture } from '@test/unit/fixtures/gestion/anomalies-de-pointage/ResizeObserverFixture';
import { dataSelector } from '@test/utils/DataSelector';
import { requiredFixture } from '@test/utils/RequiredFixture';
import { instantLocalFixture } from '@test/utils/gestion/anomalies-de-pointage/InstantLocal.fixture';
import { ActiviteAnomalieId } from '../../../domain/dossier/ActiviteAnomalieId';
import { ActiviteEchue, PointageAnomalie } from '../../../domain/dossier/DossierAnomalie';
import { PointageAnomalieId } from '../../../domain/dossier/PointageAnomalieId';
import { VueDeFrise } from './DispositionFrise';
import { FriseDossier } from './FriseDossier';
import { DemandeDeDeplacement, DeplacementDemande, PlacementDeLInstant, PlacementDemande, PoigneeDeFrise } from './PoigneeDeFrise';

const GESTES = {
  DEMARRAGE: { type: 'DEBUT' },
  DEMARRAGE_NC: { type: 'NON_CONFORMITE' },
  ARRET: { type: 'FIN' },
} as const;

type Geste = keyof typeof GESTES;

const instantAt = (heure: string, jour = 14): string => {
  const [heures = 0, minutes = 0] = heure.split(':').map(Number);
  return instantLocalFixture(new Date(2026, 8, jour, heures, minutes));
};

const pointageA = (id: string, geste: Geste, instant: string): PointageAnomalie => ({
  id: new PointageAnomalieId(id),
  fait: { ...GESTES[geste], operateur: 'op-camille', instant },
  operateurNom: 'Camille Martin',
});

const pointageFixture = (id: string, geste: Geste, heure: string): PointageAnomalie => pointageA(id, geste, instantAt(heure));

const activiteA = (id: string, debut: string, echeance: string, categorie: ActiviteEchue['categorie'] = 'TRAVAIL'): ActiviteEchue => ({
  id: new ActiviteAnomalieId(id),
  ouvrant: new PointageAnomalieId(`debut-${id}`),
  categorie,
  debut,
  echeance,
});

const activiteFixture = (id: string, debut: string, echeance: string, categorie: ActiviteEchue['categorie'] = 'TRAVAIL'): ActiviteEchue =>
  activiteA(id, instantAt(debut), instantAt(echeance), categorie);

const vueDe = (activite: ActiviteEchue, geste: Geste = 'DEMARRAGE', ...autres: readonly PointageAnomalie[]): VueDeFrise => ({
  journal: [pointageA(activite.ouvrant.pointage, geste, activite.debut), ...autres],
  activite,
});

const vueEntre = (debut: string, echeance: string, jourEcheance = 14): VueDeFrise =>
  vueDe(activiteA('a-1', instantAt(debut), instantAt(echeance, jourEcheance)));

const vueDuJour = (debut: string, echeance: string, jour: number, jourEcheance: number): VueDeFrise =>
  vueDe(activiteA('a-1', instantAt(debut, jour), instantAt(echeance, jourEcheance)));

const vueEntreInstants = (debut: Date, echeance: Date): VueDeFrise => vueDe(activiteA('a-1', debut.toISOString(), echeance.toISOString()));

const avecLaBorne = (vue: VueDeFrise, heure: string, ...pointages: readonly PointageAnomalie[]): VueDeFrise => ({
  ...vue,
  journal: [...vue.journal, ...pointages],
  borneDeFin: instantAt(heure),
});

const dossierDeLaFinAutomatique = (): VueDeFrise => vueDe(activiteFixture('a-1', '08:00', '12:00'));

const poigneeFixture = (heure: string, surcharge: Partial<PoigneeDeFrise> = {}): PoigneeDeFrise => ({
  instant: instantAt(heure),
  bornes: { min: instantAt('08:00'), max: instantAt('15:00') },
  ...surcharge,
});

const placementFixture = (surcharge: Partial<PlacementDeLInstant> = {}): PlacementDeLInstant => ({
  bornes: { min: instantAt('08:00'), max: instantAt('13:00') },
  ...surcharge,
});

const placementDeLaFixture = (): PlacementDeLInstant => placementFixture({ bornes: { min: instantAt('08:00'), max: instantAt('15:00') } });

const PLAN_WIDTH = 1000;

describe('Frise of a dossier', () => {
  let fixture: ComponentFixture<FriseDossier>;
  let requestedMoves: DeplacementDemande[];
  let requestedPlacements: PlacementDemande[];
  let resizeObserver: ResizeObserverFixture;

  beforeEach(() => {
    resizeObserver = new ResizeObserverFixture();
    requestedMoves = [];
    requestedPlacements = [];
    HTMLElement.prototype.setPointerCapture = () => undefined;
  });

  afterEach(() => {
    resizeObserver.restore();
  });

  it('should draw the marker of the pointage that opened the expired activity, and no other', async () => {
    const dossier = vueDe(activiteFixture('a-1', '08:00', '21:00'), 'DEMARRAGE', pointageFixture('fin-17', 'ARRET', '17:00'));

    await whenRenderingTheFrise(dossier);

    thenTheMarkersAre(['debut-a-1']);
  });

  it('should keep the scale on what is drawn when the journal holds pointages of other days or that open no bar', async () => {
    const dossier = vueDe(
      activiteFixture('a-1', '08:00', '11:00'),
      'DEMARRAGE',
      pointageA('veille-9', 'DEMARRAGE', instantAt('09:00', 10)),
      pointageFixture('fin-11', 'ARRET', '11:00'),
    );

    await whenRenderingTheFrise(dossier);

    thenTheMarkersAre(['debut-a-1']);
    thenTheGraduationsAre(['07:00', '08:00', '09:00', '10:00', '11:00', '12:00']);
  });

  it('should name the marker by the time of its pointage with its seconds and its gesture', async () => {
    await whenRenderingTheFrise(vueEntre('08:00', '21:00'));

    thenTheMarkerIsNamed('debut-a-1', '08:00:00 · Démarrage');
  });

  it.each([
    ['DEMARRAGE', '▶'],
    ['DEMARRAGE_NC', '▷'],
  ] as const)('should draw the %s gesture of the opening pointage with the symbol %s', async (geste, symbole) => {
    await whenRenderingTheFrise(vueDe(activiteFixture('a-1', '08:00', '21:00'), geste));

    thenTheMarkerSymbolIs('debut-a-1', symbole);
  });

  it.each([
    ['DEMARRAGE', 'false'],
    ['DEMARRAGE_NC', 'true'],
  ] as const)('should flag the marker of a %s gesture as a non-conformity: %s', async (geste, drapeau) => {
    await whenRenderingTheFrise(vueDe(activiteFixture('a-1', '08:00', '21:00'), geste));

    thenTheMarkerFlagIs('debut-a-1', 'data-non-conformite', drapeau);
  });

  it('should show under the marker the hour and minute of its pointage', async () => {
    await whenRenderingTheFrise(vueEntre('08:05', '21:00'));

    thenTheMarkerTimeIs('debut-a-1', '08:05');
  });

  it.each([
    ['TRAVAIL', 'Travail · Fin automatique'],
    ['NON_CONFORMITE', 'Non-conformité · Fin automatique'],
  ] as const)('should write on the bar of a %s activity its category and the automatic end: %s', async (categorie, texte) => {
    await whenRenderingTheFrise(vueDe(activiteFixture('a-1', '08:00', '21:00', categorie)));

    thenTheBarReads('a-1', texte);
  });

  it('should tell the category of the bar by an attribute', async () => {
    await whenRenderingTheFrise(vueDe(activiteFixture('nc-9', '09:00', '22:00', 'NON_CONFORMITE')));

    thenTheBarAttributeIs('nc-9', 'data-categorie', 'NON_CONFORMITE');
  });

  it('should end the bar of the expired activity as an automatic end', async () => {
    await whenRenderingTheFrise(vueEntre('08:00', '21:00'));

    thenTheBarAttributeIs('a-1', 'data-fin', 'AUTOMATIQUE');
  });

  it('should name the bar by its category, its received period and its automatic end', async () => {
    await whenRenderingTheFrise(vueEntre('08:00', '17:00'));

    thenTheBarIsNamed('a-1', 'Travail · lundi 14 septembre à 08:00 → lundi 14 septembre à 17:00 · Fin automatique');
  });

  it('should graduate the scale by the hour, from an hour before the first instant to an hour after the last, rounded to the hour', async () => {
    await whenRenderingTheFrise(vueEntre('08:30', '10:15'));

    thenTheGraduationsAre(['07:00', '08:00', '09:00', '10:00', '11:00', '12:00']);
  });

  it.each([
    {
      largeur: 704,
      pas: 'an hour',
      attendu: ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'],
    },
    { largeur: 500, pas: 'two hours', attendu: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'] },
    { largeur: 350, pas: 'three hours', attendu: ['09:00', '12:00', '15:00', '18:00'] },
    { largeur: 200, pas: 'four hours', attendu: ['08:00', '12:00', '16:00'] },
    { largeur: 150, pas: 'six hours', attendu: ['12:00', '18:00'] },
    { largeur: 70, pas: 'twelve hours', attendu: ['12:00'] },
  ])('should graduate every $pas on a frise $largeur pixels wide', async ({ largeur, attendu }) => {
    await whenRenderingTheFrise(vueEntre('08:00', '17:00'));

    await whenTheFriseIsMeasured(largeur);

    thenTheGraduationsAre(attendu);
    thenNoTwoGraduationsAreCloserThan(64, largeur);
  });

  it.each([
    { largeur: 300, pas: 'a day', jours: ['mar. 15 sept.', 'mer. 16 sept.', 'jeu. 17 sept.'] },
    { largeur: 150, pas: 'two days', jours: ['mer. 16 sept.'] },
    { largeur: 80, pas: 'three days', jours: ['jeu. 17 sept.'] },
    { largeur: 20, pas: 'a week, although it cannot hold 64 pixels', jours: [] },
  ])('should graduate every $pas, midnight to midnight, on a frise $largeur pixels wide holding four days', async ({ largeur, jours }) => {
    await whenRenderingTheFrise(vueDuJour('08:00', '17:00', 14, 17));

    await whenTheFriseIsMeasured(largeur);

    thenTheGraduationsAre(jours.map(() => '00:00'));
    thenTheDaysShownAre(jours);
  });

  it('should graduate the midnight that opens a week counted from the start of the scale', async () => {
    await whenRenderingTheFrise(vueDuJour('08:00', '17:00', 14, 23));

    await whenTheFriseIsMeasured(100);

    thenTheDaysShownAre(['lun. 21 sept.']);
  });

  it('should graduate the hours the way it did when the frise is wide, as the reference width leaves 64 pixels per hour', async () => {
    await whenRenderingTheFrise(vueEntre('08:00', '17:00'));

    thenTheNumberOfGraduationsIs(12);
  });

  it('should take a new measure of its host into account', async () => {
    await whenRenderingTheFrise(vueEntre('08:00', '17:00'));
    await whenTheFriseIsMeasured(150);

    await whenTheFriseIsMeasured(704);

    thenTheNumberOfGraduationsIs(12);
  });

  it('should ignore a measure of zero width', async () => {
    await whenRenderingTheFrise(vueEntre('08:00', '17:00'));
    await whenTheFriseIsMeasured(150);

    await whenTheFriseIsMeasured(0);

    thenTheGraduationsAre(['12:00', '18:00']);
  });

  it('should stop observing the size of its host when destroyed', async () => {
    await whenRenderingTheFrise(vueEntre('08:00', '17:00'));

    whenDestroyingTheFrise();

    expect(resizeObserver.observantUnElement).toBe(false);
  });

  it('should keep the exact time of the marker on a narrow frise, whatever the room its position leaves', async () => {
    await whenRenderingTheFrise(vueEntre('08:00', '17:00'));

    await whenTheFriseIsMeasured(100);

    thenTheMarkerTimeIs('debut-a-1', '08:00');
  });

  it('should keep the exact time of the handle on a narrow frise, whatever the room its position leaves', async () => {
    await whenRenderingTheFrise(dossierDeLaFinAutomatique(), poigneeFixture('10:45'));

    await whenTheFriseIsMeasured(100);

    thenTheHandleIsReadAs('10:45');
  });

  it('should not shift the handle under the pointer when it is grabbed while held away from the edge', async () => {
    await whenRenderingTheFrise(dossierDeLaFinAutomatique(), poigneeFixture('10:45'));
    await whenTheFriseIsMeasured(100);

    whenDraggingTheHandle({ from: 780, to: 780 });

    thenTheMovesAsked([{ kind: 'VERS', instant: new Date(2026, 8, 14, 10, 45).getTime() }]);
  });

  it('should reach the start and the end of the expired activity, not a stop that opens no bar, when graduating the scale', async () => {
    const dossier = vueDe(activiteFixture('a-1', '06:00', '08:00'), 'DEMARRAGE', pointageFixture('fin-10', 'ARRET', '10:00'));

    await whenRenderingTheFrise(dossier);

    thenTheGraduationsAre(['05:00', '06:00', '07:00', '08:00', '09:00']);
  });

  it('should show the day at midnight when the activity spans several days', async () => {
    await whenRenderingTheFrise(vueEntre('22:00', '02:00', 15));

    thenTheGraduationsAre(['21:00', '22:00', '23:00', '00:00', '01:00', '02:00', '03:00']);
    thenTheDaysShownAre(['mar. 15 sept.']);
  });

  it('should show no day on an activity that crosses no midnight', async () => {
    await whenRenderingTheFrise(vueEntre('08:00', '17:00'));

    thenTheDaysShownAre([]);
  });

  it('should draw no marker for a pointage whose instant it cannot read, nor let it spoil the scale', async () => {
    const activite = activiteFixture('a-1', '08:00', '09:00');
    const dossier = { journal: [pointageA('debut-a-1', 'DEMARRAGE', 'illisible')], activite };

    await whenRenderingTheFrise(dossier);

    thenTheMarkersAre([]);
    thenTheGraduationsAre(['07:00', '08:00', '09:00', '10:00']);
  });

  it('should be tall enough for its bar', async () => {
    await whenRenderingTheFrise(vueEntre('08:00', '21:00'));

    expect(Number.parseFloat(thePlan().style.height)).toBeGreaterThanOrEqual(topOf(bar('a-1')) + 44);
  });

  it('should ask to place the instant where the pointages row is clicked', async () => {
    await whenRenderingTheFrise(dossierDeLaFinAutomatique(), undefined, placementFixture());

    whenClickingThePlacementRowAt(500);

    thenThePlacementsAsked([new Date(2026, 8, 14, 10, 0).getTime()]);
  });

  it.each([
    { cas: 'down to the nearest five minutes', clientX: 504, heure: new Date(2026, 8, 14, 10, 0) },
    { cas: 'up to the nearest five minutes', clientX: 513, heure: new Date(2026, 8, 14, 10, 5) },
  ])('should round the instant of the click $cas', async ({ clientX, heure }) => {
    await whenRenderingTheFrise(dossierDeLaFinAutomatique(), undefined, placementFixture());

    whenClickingThePlacementRowAt(clientX);

    thenThePlacementsAsked([heure.getTime()]);
  });

  it('should draw no placement row while no instant waits to be placed', async () => {
    await whenRenderingTheFrise(dossierDeLaFinAutomatique());

    thenNoPlacementRowIsDrawn();
  });

  it('should extend the scale to the hour that follows the bound of the handle while an instant waits to be placed', async () => {
    await whenRenderingTheFrise(dossierDeLaFinAutomatique(), undefined, placementDeLaFixture());

    thenTheGraduationsAre(['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00']);
  });

  it('should draw the handle of the proposed instant as a slider', async () => {
    await whenRenderingTheFrise(dossierDeLaFinAutomatique(), poigneeFixture('12:00'));

    thenTheHandleIsASlider();
  });

  it('should extend the scale to the hour that follows the bound of the handle while a handle is active', async () => {
    await whenRenderingTheFrise(dossierDeLaFinAutomatique(), poigneeFixture('10:00'));

    thenTheGraduationsAre(['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00']);
  });

  it('should keep the normal scale when the clock stands before the last received instant', async () => {
    await whenRenderingTheFrise(
      dossierDeLaFinAutomatique(),
      poigneeFixture('10:00', { bornes: { min: instantAt('08:00'), max: instantAt('10:00') } }),
    );

    thenTheGraduationsAre(['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00']);
  });

  it('should extend the scale only up to the hour that follows the clock', async () => {
    await whenRenderingTheFrise(
      dossierDeLaFinAutomatique(),
      poigneeFixture('10:00', { bornes: { min: instantAt('08:00'), max: instantAt('14:20') } }),
    );

    thenTheGraduationsAre(['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00']);
  });

  it.each([
    { cas: 'after', instant: new Date(2026, 8, 20, 10, 0), tenue: new Date(2026, 8, 14, 15, 0) },
    { cas: 'before', instant: new Date(2026, 8, 10, 10, 0), tenue: new Date(2026, 8, 14, 8, 0) },
  ])(
    'should hold the handle at the nearest end of its range on the scale when it stands $cas every received instant',
    async ({ instant, tenue }) => {
      await whenRenderingTheFrise(dossierDeLaFinAutomatique(), poigneeFixture('10:00', { instant: instantLocalFixture(instant) }));

      thenTheHandleHoldsAt(tenue);
    },
  );

  it('should give the handle a range, a value and a readable time within its bounds', async () => {
    await whenRenderingTheFrise(
      dossierDeLaFinAutomatique(),
      poigneeFixture('10:05', { bornes: { min: instantAt('08:00'), max: instantAt('13:00') } }),
    );

    thenTheHandleReads({
      min: new Date(2026, 8, 14, 8, 0).getTime(),
      max: new Date(2026, 8, 14, 13, 0).getTime(),
      now: new Date(2026, 8, 14, 10, 5).getTime(),
      text: '10:05',
    });
  });

  it.each<{ touche: string; maj: boolean; demande: DemandeDeDeplacement }>([
    { touche: 'ArrowRight', maj: false, demande: { kind: 'DE', minutes: 1 } },
    { touche: 'ArrowUp', maj: false, demande: { kind: 'DE', minutes: 1 } },
    { touche: 'ArrowLeft', maj: false, demande: { kind: 'DE', minutes: -1 } },
    { touche: 'ArrowDown', maj: false, demande: { kind: 'DE', minutes: -1 } },
    { touche: 'ArrowRight', maj: true, demande: { kind: 'DE', minutes: 15 } },
    { touche: 'ArrowUp', maj: true, demande: { kind: 'DE', minutes: 15 } },
    { touche: 'ArrowLeft', maj: true, demande: { kind: 'DE', minutes: -15 } },
    { touche: 'ArrowDown', maj: true, demande: { kind: 'DE', minutes: -15 } },
    { touche: 'Home', maj: false, demande: { kind: 'BORNE', borne: 'MIN' } },
    { touche: 'End', maj: false, demande: { kind: 'BORNE', borne: 'MAX' } },
  ])('should ask $demande.kind the handle when $touche is pressed (shift: $maj)', async ({ touche, maj, demande }) => {
    await whenRenderingTheFrise(dossierDeLaFinAutomatique(), poigneeFixture('10:00'));

    whenPressingKeyOnTheHandle(touche, maj);

    thenTheMovesAsked([demande]);
  });

  it('should leave the other keys to the browser so that the tab key still leaves the handle', async () => {
    await whenRenderingTheFrise(dossierDeLaFinAutomatique(), poigneeFixture('10:00'));

    const touche = whenPressingKeyOnTheHandle('Tab');

    thenTheMovesAsked([]);
    thenTheKeyIsLeftToTheBrowser(touche);
  });

  it('should ask to move the handle to the instant under the pointer dragging it', async () => {
    await whenRenderingTheFrise(
      dossierDeLaFinAutomatique(),
      poigneeFixture('10:00', { bornes: { min: instantAt('08:00'), max: instantAt('13:00') } }),
    );

    whenDraggingTheHandle({ from: 500, to: 750 });

    thenTheMovesAsked([{ kind: 'VERS', instant: new Date(2026, 8, 14, 11, 30).getTime() }]);
  });

  it.each([
    { cas: 'down to the nearest five minutes', to: 756, heure: new Date(2026, 8, 14, 11, 30) },
    { cas: 'up to the nearest five minutes', to: 762, heure: new Date(2026, 8, 14, 11, 35) },
  ])('should round the instant under the pointer $cas', async ({ to, heure }) => {
    await whenRenderingTheFrise(
      dossierDeLaFinAutomatique(),
      poigneeFixture('10:00', { bornes: { min: instantAt('08:00'), max: instantAt('13:00') } }),
    );

    whenDraggingTheHandle({ from: 500, to });

    thenTheMovesAsked([{ kind: 'VERS', instant: heure.getTime() }]);
  });

  it('should keep the point of the handle that was grabbed under the pointer instead of jumping to its centre', async () => {
    await whenRenderingTheFrise(
      dossierDeLaFinAutomatique(),
      poigneeFixture('10:00', { bornes: { min: instantAt('08:00'), max: instantAt('13:00') } }),
    );

    whenDraggingTheHandle({ from: 520, to: 770 });

    thenTheMovesAsked([{ kind: 'VERS', instant: new Date(2026, 8, 14, 11, 30).getTime() }]);
  });

  it('should ignore a pointer that moves over the handle without having pressed it', async () => {
    await whenRenderingTheFrise(
      dossierDeLaFinAutomatique(),
      poigneeFixture('10:00', { bornes: { min: instantAt('08:00'), max: instantAt('13:00') } }),
    );

    whenMovingThePointerOverTheHandleTo(750);

    thenTheMovesAsked([]);
  });

  it.each(['pointerup', 'pointercancel'])('should stop following the pointer once it ends with %s', async fin => {
    await whenRenderingTheFrise(
      dossierDeLaFinAutomatique(),
      poigneeFixture('10:00', { bornes: { min: instantAt('08:00'), max: instantAt('13:00') } }),
    );
    whenDraggingTheHandle({ from: 500, to: 750 });

    whenTheGestureEndsWith(fin);
    whenMovingThePointerOverTheHandleTo(900);

    thenTheMovesAsked([{ kind: 'VERS', instant: new Date(2026, 8, 14, 11, 30).getTime() }]);
  });

  it('should capture the pointer that presses the handle so that the drag goes on outside of it', async () => {
    await whenRenderingTheFrise(
      dossierDeLaFinAutomatique(),
      poigneeFixture('10:00', { bornes: { min: instantAt('08:00'), max: instantAt('13:00') } }),
    );
    const captured = givenTheBrowserCapturesPointers();

    whenPressingTheHandleAt(500, 7);

    expect(captured).toEqual([7]);
  });

  it('should name the handle and show the time it stands at', async () => {
    await whenRenderingTheFrise(dossierDeLaFinAutomatique(), poigneeFixture('10:05'));

    thenTheHandleIsNamedAndShows('Heure proposée du fait', '10:05');
  });

  describe('of the bound of the end', () => {
    it('should draw the marker of the next start of the key on the instant that bounds the end', async () => {
      const dossier = avecLaBorne(vueEntre('08:00', '12:00'), '20:00', pointageFixture('debut-suivant', 'DEMARRAGE', '20:00'));

      await whenRenderingTheFrise(dossier);

      thenTheMarkersAre(['debut-a-1', 'debut-suivant']);
      thenTheMarkerIsNamed('debut-suivant', '20:00:00 · Démarrage');
      thenTheMarkerStandsAtTheHour('debut-suivant', 20);
    });

    it('should draw the marker of a next start in non-conformity as a non-conformity', async () => {
      const dossier = avecLaBorne(vueEntre('08:00', '12:00'), '20:00', pointageFixture('nc-suivante', 'DEMARRAGE_NC', '20:00'));

      await whenRenderingTheFrise(dossier);

      thenTheMarkerFlagIs('nc-suivante', 'data-non-conformite', 'true');
    });

    it('should draw a closure marker when no start of the key bounds the end', async () => {
      const dossier = avecLaBorne(vueEntre('08:00', '12:00'), '20:00');

      await whenRenderingTheFrise(dossier);

      thenTheMarkersAre(['debut-a-1']);
      thenTheClosureIsNamed('20:00:00 · Clôture');
      thenTheClosureReads('Clôture 20:00');
    });

    it('should draw a closure marker rather than a stop that falls on the instant of the bound', async () => {
      const dossier = avecLaBorne(vueEntre('08:00', '12:00'), '20:00', pointageFixture('fin-20', 'ARRET', '20:00'));

      await whenRenderingTheFrise(dossier);

      thenTheMarkersAre(['debut-a-1']);
      thenTheClosureIsNamed('20:00:00 · Clôture');
    });

    it('should draw no marker for the bound when nothing bounds the end', async () => {
      await whenRenderingTheFrise(vueEntre('08:00', '12:00'));

      thenNoClosureIsDrawn();
    });

    it('should extend the scale to the hour after the bound of the end', async () => {
      await whenRenderingTheFrise(avecLaBorne(vueEntre('08:00', '12:00'), '20:00'));

      thenTheGraduationsAre([
        '07:00',
        '08:00',
        '09:00',
        '10:00',
        '11:00',
        '12:00',
        '13:00',
        '14:00',
        '15:00',
        '16:00',
        '17:00',
        '18:00',
        '19:00',
        '20:00',
        '21:00',
      ]);
    });

    it('should let the pointer through the closure marker to the placement row under it', async () => {
      await whenRenderingTheFrise(avecLaBorne(vueEntre('08:00', '12:00'), '20:00'), undefined, placementDeLaFixture());

      thenThePointerGoesThroughTheClosure();
    });
  });

  describe('of an automatic end', () => {
    const uneFinAutomatique = (): VueDeFrise => vueEntre('08:00', '12:00');

    it('should lay the bar of the expired activity under the axis and its start marker on the start of its bar', async () => {
      await whenRenderingTheFrise(vueEntre('08:00', '21:00'));

      thenTheBarsStandOnRowsAt([36]);
      thenTheStartMarkerStandsOnTheStartOfItsBar('debut-a-1', 'a-1');
    });

    it('should stand the handle on the row of the bar it terminates, without a row of its own', async () => {
      await whenRenderingTheFrise(vueEntre('08:00', '21:00'), poigneeFixture('17:00'));

      expect(topOf(handle())).toBe(36);
      thenTheBarsStandOnRowsAt([36]);
    });

    it('should lay the placement row on the row of the bar the instant will terminate, without a row of its own', async () => {
      await whenRenderingTheFrise(vueEntre('08:00', '21:00'), undefined, placementFixture());

      thenThePlacementRowStandsAt({ top: 36, height: 44 });
      thenTheBarsStandOnRowsAt([36]);
    });

    it('should stand an hourless handle at the received end of the bar it will terminate, in the tab order and read as holding no hour', async () => {
      await whenRenderingTheFrise(uneFinAutomatique(), undefined, placementDeLaFixture());

      thenTheHandleStandsAt({ left: '62.5%', onTheRowOf: 'a-1' });
      thenTheHandleIsHourless('Heure ?');
      thenTheHandleIsASliderInTheTabOrderWithNoHour();
      thenTheAutomaticEndsDrawnAre([]);
      thenNoPartIsRemoved();
    });

    it('should ask to place the instant where the hourless handle is dragged to', async () => {
      await whenRenderingTheFrise(uneFinAutomatique(), undefined, placementDeLaFixture());

      whenDraggingTheHandle({ from: 625, to: 750 });

      thenThePlacementsAsked([new Date(2026, 8, 14, 13, 0).getTime()]);
      thenTheMovesAsked([]);
    });

    it('should ask for nothing when the hourless handle is pressed and released without moving', async () => {
      await whenRenderingTheFrise(uneFinAutomatique(), undefined, placementDeLaFixture());

      whenPressingTheHandleAt(625);
      whenTheGestureEndsWith('pointerup');

      thenThePlacementsAsked([]);
      thenTheMovesAsked([]);
    });

    it.each<{ touche: string; maj: boolean; demande: DemandeDeDeplacement }>([
      { touche: 'ArrowRight', maj: false, demande: { kind: 'VERS', instant: new Date(2026, 8, 14, 12, 0).getTime() } },
      { touche: 'ArrowLeft', maj: true, demande: { kind: 'VERS', instant: new Date(2026, 8, 14, 12, 0).getTime() } },
      { touche: 'Home', maj: false, demande: { kind: 'BORNE', borne: 'MIN' } },
      { touche: 'End', maj: false, demande: { kind: 'BORNE', borne: 'MAX' } },
    ])(
      'should ask to place the instant $demande.kind when $touche is pressed on the hourless handle (shift: $maj)',
      async ({ touche, maj, demande }) => {
        await whenRenderingTheFrise(uneFinAutomatique(), undefined, placementDeLaFixture());

        const pressee = whenPressingKeyOnTheHandle(touche, maj);

        thenThePlacementDemandsAsked([demande]);
        thenTheMovesAsked([]);
        expect(pressee.defaultPrevented).toBe(true);
      },
    );

    it('should leave the other keys to the browser on the hourless handle', async () => {
      await whenRenderingTheFrise(uneFinAutomatique(), undefined, placementDeLaFixture());

      const touche = whenPressingKeyOnTheHandle('Tab');

      thenThePlacementsAsked([]);
      thenTheKeyIsLeftToTheBrowser(touche);
    });

    it('should keep the same element for the handle once its first move gave the fact an hour', async () => {
      await whenRenderingTheFrise(uneFinAutomatique(), undefined, placementDeLaFixture());
      const hourlessHandle = handle();
      const touchedNodes = givenTheNodesOfThePlanAreWatched();

      await whenTheFactGetsItsHour(poigneeFixture('13:00', { bornes: placementDeLaFixture().bornes }));

      expect(handle()).toBe(hourlessHandle);
      expect(touchedNodes()).not.toContain(hourlessHandle);
      thenTheHandleHoldsAt(new Date(2026, 8, 14, 13, 0));
      thenTheHandleIsASliderInTheTabOrder();
    });

    it('should go on moving the handle within the same gesture once the first move gave the fact an hour', async () => {
      await whenRenderingTheFrise(uneFinAutomatique(), undefined, placementDeLaFixture());
      whenDraggingTheHandle({ from: 625, to: 750 });
      await whenTheFactGetsItsHour(poigneeFixture('13:00', { bornes: placementDeLaFixture().bornes }));

      whenMovingThePointerOverTheHandleTo(875);

      thenTheMovesAsked([{ kind: 'VERS', instant: new Date(2026, 8, 14, 14, 0).getTime() }]);
    });

    it('should ask to place the instant where the row of the bar is clicked beyond the bar', async () => {
      await whenRenderingTheFrise(uneFinAutomatique(), undefined, placementDeLaFixture());

      whenClickingThePlacementRowAt(750);

      thenThePlacementsAsked([new Date(2026, 8, 14, 13, 0).getTime()]);
    });

    it('should end the bar the handle terminates at the time the handle stands at', async () => {
      await whenRenderingTheFrise(uneFinAutomatique(), poigneeFixture('10:00'));

      thenTheBarSpans('a-1', { left: '12.5%', width: '25%' });
      thenTheHandleStandsAt({ left: '37.5%', onTheRowOf: 'a-1' });
      thenTheBarAttributeIs('a-1', 'data-fin', 'PROPOSEE');
      thenTheBarIsNamed(
        'a-1',
        'Travail · lundi 14 septembre à 08:00 → lundi 14 septembre à 12:00 · Fin automatique · heure proposée 10:00',
      );
    });

    it('should draw the part the handle removes up to the received end', async () => {
      await whenRenderingTheFrise(uneFinAutomatique(), poigneeFixture('10:00'));

      thenTheRemovedPartSpans({ left: '37.5%', width: '25%' });
      thenTheRemovedPartStandsOnTheRowOf('a-1');
      thenTheRemovedPartIsDecorative();
    });

    it('should lengthen the bar past its received end when the handle stands after it, with nothing removed', async () => {
      await whenRenderingTheFrise(uneFinAutomatique(), poigneeFixture('14:00'));

      thenTheBarSpans('a-1', { left: '12.5%', width: '75%' });
      thenNoPartIsRemoved();
    });

    it('should draw the automatic end of the expired activity while the handle is active', async () => {
      await whenRenderingTheFrise(uneFinAutomatique(), poigneeFixture('10:00'));

      thenTheAutomaticEndsDrawnAre(['Fin automatique 12:00']);
      thenTheAutomaticEndStands({ left: '62.5%', onTheRowOf: 'a-1' });
      thenTheAutomaticEndIsDecorative();
    });

    it('should draw no automatic end while no handle is active', async () => {
      await whenRenderingTheFrise(uneFinAutomatique());

      thenTheAutomaticEndsDrawnAre([]);
    });

    it('should keep on the marker laid on its bar its name, its symbol and its hour', async () => {
      await whenRenderingTheFrise(vueEntre('08:00', '11:00'));

      thenTheMarkerIsNamed('debut-a-1', '08:00:00 · Démarrage');
      thenTheMarkerSymbolIs('debut-a-1', '▶');
      thenTheMarkerTimeIs('debut-a-1', '08:00');
    });

    it('should draw the marker and the bar as images, with no button, out of the tab order', async () => {
      await whenRenderingTheFrise(uneFinAutomatique());

      thenTheMarkersAndTheBarsAreImages(['debut-a-1'], ['a-1']);
      thenTheTabOrderIs([]);
    });

    it('should let the pointer through the marker and the bar to the placement row under them', async () => {
      await whenRenderingTheFrise(uneFinAutomatique(), undefined, placementDeLaFixture());

      thenThePointerGoesThroughTheMarkersAndTheBars(['debut-a-1'], ['a-1']);
    });

    it('should leave the handle the only element of the focus order, still a slider that moves with the keys', async () => {
      await whenRenderingTheFrise(dossierDeLaFinAutomatique(), poigneeFixture('10:00'));

      whenPressingKeyOnTheHandle('ArrowLeft');

      thenTheFocusOrderIs(['Heure proposée du fait']);
      thenTheHandleIsASlider();
      thenTheMovesAsked([{ kind: 'DE', minutes: -1 }]);
    });
  });

  const whenRenderingTheFrise = async (dossier: VueDeFrise, poignee?: PoigneeDeFrise, placement?: PlacementDeLInstant): Promise<void> => {
    fixture = TestBed.createComponent(FriseDossier);
    fixture.componentRef.setInput('dossier', dossier);
    fixture.componentRef.setInput('poignee', poignee);
    fixture.componentRef.setInput('placement', placement);
    fixture.componentRef.setInput('now', new Date(2026, 9, 5, 10, 0));
    fixture.componentInstance.deplacementDemande.subscribe(demande => requestedMoves.push(demande));
    fixture.componentInstance.placementDemande.subscribe(demande => requestedPlacements.push(demande));
    await fixture.whenStable();
  };

  const whenTheFactGetsItsHour = async (poignee: PoigneeDeFrise): Promise<void> => {
    fixture.componentRef.setInput('placement', undefined);
    fixture.componentRef.setInput('poignee', poignee);
    await fixture.whenStable();
  };

  const whenTheFriseIsMeasured = async (width: number): Promise<void> => {
    resizeObserver.announce(width);
    await fixture.whenStable();
  };

  const whenDestroyingTheFrise = (): void => {
    fixture.destroy();
  };

  const handle = (): HTMLElement =>
    requiredFixture((fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(dataSelector('anomalie-poignee')), 'handle');

  const givenTheBrowserCapturesPointers = (): number[] => {
    const captured: number[] = [];
    handle().setPointerCapture = (pointerId: number) => {
      captured.push(pointerId);
    };
    return captured;
  };

  const whenDraggingTheHandle = ({ from, to }: { from: number; to: number }): void => {
    whenPressingTheHandleAt(from);
    whenMovingThePointerOverTheHandleTo(to);
  };

  const whenPressingTheHandleAt = (clientX: number, pointerId = 1): void => {
    thePlan().getBoundingClientRect = () => new DOMRect(0, 0, PLAN_WIDTH, 200);
    handle().dispatchEvent(new PointerEvent('pointerdown', { pointerId, clientX, bubbles: true }));
  };

  const whenMovingThePointerOverTheHandleTo = (clientX: number, pointerId = 1): void => {
    thePlan().getBoundingClientRect = () => new DOMRect(0, 0, PLAN_WIDTH, 200);
    handle().dispatchEvent(new PointerEvent('pointermove', { pointerId, clientX, bubbles: true }));
  };

  const whenClickingThePlacementRowAt = (clientX: number): void => {
    thePlan().getBoundingClientRect = () => new DOMRect(0, 0, PLAN_WIDTH, 200);
    requiredFixture(
      (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(dataSelector('anomalie-frise-placement')),
      'placement row',
    ).dispatchEvent(new MouseEvent('click', { clientX, bubbles: true }));
  };

  const thenNoPlacementRowIsDrawn = (): void => {
    expect((fixture.nativeElement as HTMLElement).querySelector(dataSelector('anomalie-frise-placement'))).toBeNull();
  };

  const thenThePlacementsAsked = (expected: readonly number[]): void => {
    thenThePlacementDemandsAsked(expected.map(instant => ({ kind: 'VERS', instant })));
  };

  const thenThePlacementDemandsAsked = (expected: readonly DemandeDeDeplacement[]): void => {
    expect(requestedPlacements.map(placement => placement.demande)).toEqual(expected);
  };

  const whenTheGestureEndsWith = (type: string, pointerId = 1): void => {
    handle().dispatchEvent(new PointerEvent(type, { pointerId, bubbles: true }));
  };

  const whenPressingKeyOnTheHandle = (key: string, shiftKey = false): KeyboardEvent => {
    const touche = new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true });
    handle().dispatchEvent(touche);
    return touche;
  };

  const thenTheKeyIsLeftToTheBrowser = (touche: KeyboardEvent): void => {
    expect(touche.defaultPrevented).toBe(false);
  };

  const thenTheMovesAsked = (expected: readonly DemandeDeDeplacement[]): void => {
    expect(requestedMoves.map(deplacement => deplacement.demande)).toEqual(expected);
  };

  const thenTheHandleStandsAt = (expected: { left: string; onTheRowOf: string }): void => {
    expect({ left: handle().style.left, top: handle().style.top }).toEqual({
      left: expected.left,
      top: bar(expected.onTheRowOf).style.top,
    });
  };

  const thenTheHandleIsHourless = (expectedText: string): void => {
    expect(handle().hasAttribute('data-sans-heure')).toBe(true);
    expect(handle().textContent.trim()).toBe(expectedText);
  };

  const thenTheHandleIsASliderInTheTabOrderWithNoHour = (): void => {
    expect(handle().getAttribute('role')).toBe('slider');
    expect(handle().hasAttribute('aria-hidden')).toBe(false);
    expect(handle().getAttribute('tabindex')).toBe('0');
    expect(handle().hasAttribute('aria-valuenow')).toBe(false);
    expect(handle().getAttribute('aria-valuetext')).toBe('Aucune heure posée');
  };

  const givenTheNodesOfThePlanAreWatched = (): (() => readonly Node[]) => {
    const records: MutationRecord[] = [];
    const observer = new MutationObserver(batch => records.push(...batch));
    observer.observe(thePlan(), { childList: true, subtree: true });
    return () => {
      records.push(...observer.takeRecords());
      observer.disconnect();
      return records.flatMap(record => [...record.addedNodes, ...record.removedNodes]);
    };
  };

  const thenTheHandleIsASliderInTheTabOrder = (): void => {
    expect(handle().hasAttribute('data-sans-heure')).toBe(false);
    expect(handle().hasAttribute('aria-hidden')).toBe(false);
    expect(handle().getAttribute('tabindex')).toBe('0');
  };

  const thenTheHandleIsASlider = (): void => {
    expect(handle().getAttribute('role')).toBe('slider');
  };

  const thenTheHandleReads = (expected: { min: number; max: number; now: number; text: string }): void => {
    expect({
      min: Number(handle().getAttribute('aria-valuemin')),
      max: Number(handle().getAttribute('aria-valuemax')),
      now: Number(handle().getAttribute('aria-valuenow')),
      text: handle().getAttribute('aria-valuetext'),
    }).toEqual(expected);
  };

  const thenTheHandleIsReadAs = (expected: string): void => {
    expect(handle().getAttribute('aria-valuetext')).toBe(expected);
  };

  const thenTheHandleIsNamedAndShows = (name: string, time: string): void => {
    expect(handle().getAttribute('aria-label')).toBe(name);
    expect(handle().textContent.trim()).toBe(time);
  };

  const thenTheHandleHoldsAt = (expected: Date): void => {
    expect(Number(handle().getAttribute('aria-valuenow'))).toBe(expected.getTime());
  };

  const markers = (): HTMLElement[] => [
    ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(dataSelector('anomalie-pointage')),
  ];

  const marker = (pointage: string): HTMLElement =>
    requiredFixture(
      markers().find(candidate => candidate.dataset['pointage'] === pointage),
      `marker of ${pointage}`,
    );

  const thenTheMarkerIsNamed = (pointage: string, expected: string): void => {
    expect(marker(pointage).getAttribute('aria-label')).toBe(expected);
  };

  const thenTheMarkerFlagIs = (pointage: string, attribut: string, expected: string): void => {
    expect(marker(pointage).getAttribute(attribut)).toBe(expected);
  };

  const thenTheMarkerSymbolIs = (pointage: string, expected: string): void => {
    const symbole = requiredFixture(
      marker(pointage).querySelector<HTMLElement>(dataSelector('anomalie-pointage-symbole')),
      'marker symbol',
    );
    expect(symbole.textContent.trim()).toBe(expected);
  };

  const thenTheMarkerTimeIs = (pointage: string, expected: string): void => {
    const heure = requiredFixture(marker(pointage).querySelector<HTMLElement>(dataSelector('anomalie-pointage-heure')), 'marker time');
    expect(heure.textContent.trim()).toBe(expected);
  };

  const bars = (): HTMLElement[] => [
    ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(dataSelector('anomalie-activite')),
  ];

  const bar = (activite: string): HTMLElement =>
    requiredFixture(
      bars().find(candidate => candidate.dataset['activite'] === activite),
      `bar of ${activite}`,
    );

  const thenTheBarReads = (activite: string, expected: string): void => {
    expect(bar(activite).textContent.replace(/\s+/g, ' ').trim()).toBe(expected);
  };

  const thenTheBarAttributeIs = (activite: string, attribut: string, expected: string | null): void => {
    expect(bar(activite).getAttribute(attribut)).toBe(expected);
  };

  const thenTheBarNameEndsWith = (activite: string, expected: string): void => {
    expect(bar(activite).getAttribute('aria-label')?.slice(-expected.length)).toBe(expected);
  };

  const thenTheBarIsNamed = (activite: string, expected: string): void => {
    expect(bar(activite).getAttribute('aria-label')).toBe(expected);
  };

  const thenTheMarkersAndTheBarsAreImages = (pointages: readonly string[], activites: readonly string[]): void => {
    const elements = [...pointages.map(marker), ...activites.map(bar)];
    expect(elements.map(element => [element.tagName, element.getAttribute('role')])).toEqual(elements.map(() => ['DIV', 'img']));
  };

  const thenThePointerGoesThroughTheMarkersAndTheBars = (pointages: readonly string[], activites: readonly string[]): void => {
    const elements = [...pointages.map(marker), ...activites.map(bar)];
    expect(elements.map(element => getComputedStyle(element).pointerEvents)).toEqual(elements.map(() => 'none'));
  };

  const thenTheTabOrderIs = (expected: readonly string[]): void => {
    const buttons = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')];
    expect(buttons.map(button => button.getAttribute('aria-label'))).toEqual(expected);
  };

  const thenTheFocusOrderIs = (expected: readonly string[]): void => {
    const focusables = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button, [role="slider"]')];
    expect(focusables.map(focusable => focusable.getAttribute('aria-label'))).toEqual(expected);
  };

  const thenTheGraduationsAre = (expected: readonly string[]): void => {
    const graduations = [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(dataSelector('anomalie-frise-graduation-heure')),
    ];
    expect(graduations.map(graduation => graduation.textContent.trim())).toEqual(expected);
  };

  const thenTheNumberOfGraduationsIs = (expected: number): void => {
    expect((fixture.nativeElement as HTMLElement).querySelectorAll(dataSelector('anomalie-frise-graduation'))).toHaveLength(expected);
  };

  const thenTheGraduationsStandAt = (expected: readonly number[]): void => {
    const lefts = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(dataSelector('anomalie-frise-graduation'))].map(
      graduation => Number.parseFloat(graduation.style.left),
    );
    expect(lefts).toHaveLength(expected.length);
    expected.forEach((left, rang) => {
      expect(lefts[rang]).toBeCloseTo(left);
    });
  };

  const thenNoTwoGraduationsAreCloserThan = (pixels: number, width: number): void => {
    const lefts = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(dataSelector('anomalie-frise-graduation'))].map(
      graduation => (Number.parseFloat(graduation.style.left) / 100) * width,
    );
    lefts.slice(1).forEach((left, rang) => {
      expect(left - (lefts[rang] ?? Number.NaN)).toBeGreaterThanOrEqual(pixels);
    });
  };

  const topOf = (element: HTMLElement): number => Number.parseFloat(element.style.top);

  const thePlan = (): HTMLElement =>
    requiredFixture((fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(dataSelector('anomalie-frise-plan')), 'frise plan');

  const thenTheDaysShownCountIs = (expected: number): void => {
    expect((fixture.nativeElement as HTMLElement).querySelectorAll(dataSelector('anomalie-frise-jour'))).toHaveLength(expected);
  };

  const thenTheDaysShownAre = (expected: readonly string[]): void => {
    const jours = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(dataSelector('anomalie-frise-jour'))];
    expect(jours.map(jour => jour.textContent.trim())).toEqual(expected);
  };

  const thenTheBarsStandOnRowsAt = (expected: readonly number[]): void => {
    expect(bars().map(topOf)).toEqual(expected);
  };

  const thenTheStartMarkerStandsOnTheStartOfItsBar = (pointage: string, activite: string): void => {
    expect(marker(pointage).style.left).toBe(bar(activite).style.left);
    expect(marker(pointage).style.top).toBe(bar(activite).style.top);
  };

  const removedPart = (): HTMLElement | null =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(dataSelector('anomalie-frise-retrait'));

  const thenTheRemovedPartSpans = (expected: { left: string; width: string }): void => {
    const part = requiredFixture(removedPart(), 'removed part');
    expect({ left: part.style.left, width: part.style.width }).toEqual(expected);
  };

  const thenTheRemovedPartStandsOnTheRowOf = (activite: string): void => {
    expect(requiredFixture(removedPart(), 'removed part').style.top).toBe(bar(activite).style.top);
  };

  const thenNoPartIsRemoved = (): void => {
    expect(removedPart()).toBeNull();
  };

  const automaticEnds = (): HTMLElement[] => [
    ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(dataSelector('anomalie-frise-fin-recue')),
  ];

  const thenTheAutomaticEndsDrawnAre = (expected: readonly string[]): void => {
    expect(automaticEnds().map(end => end.textContent.replace(/\s+/g, ' ').trim())).toEqual(expected);
  };

  const thenTheAutomaticEndStands = (expected: { left: string; onTheRowOf: string }): void => {
    const [end] = automaticEnds();
    expect({ left: requiredFixture(end, 'automatic end').style.left, top: requiredFixture(end, 'automatic end').style.top }).toEqual({
      left: expected.left,
      top: bar(expected.onTheRowOf).style.top,
    });
  };

  const thenTheAutomaticEndIsDecorative = (): void => {
    expect(requiredFixture(automaticEnds()[0], 'automatic end').getAttribute('aria-hidden')).toBe('true');
  };

  const thenTheRemovedPartIsDecorative = (): void => {
    expect(requiredFixture(removedPart(), 'removed part').getAttribute('aria-hidden')).toBe('true');
  };

  const thenTheBarSpans = (activite: string, expected: { left: string; width: string }): void => {
    expect({ left: bar(activite).style.left, width: bar(activite).style.width }).toEqual(expected);
  };

  const thenThePlacementRowStandsAt = (expected: { top: number; height: number }): void => {
    const row = requiredFixture(
      (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(dataSelector('anomalie-frise-placement')),
      'placement row',
    );
    expect({ top: topOf(row), height: Number.parseFloat(row.style.height) }).toEqual(expected);
  };

  const closure = (): HTMLElement | null =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(dataSelector('anomalie-cloture'));

  const thenTheClosureIsNamed = (expected: string): void => {
    expect(requiredFixture(closure(), 'closure marker').getAttribute('aria-label')).toBe(expected);
  };

  const thenTheClosureReads = (expected: string): void => {
    const lines = [...requiredFixture(closure(), 'closure marker').children].map(line => line.textContent.trim());
    expect(lines.join(' ')).toBe(expected);
  };

  const thenNoClosureIsDrawn = (): void => {
    expect(closure()).toBeNull();
  };

  const thenThePointerGoesThroughTheClosure = (): void => {
    expect(getComputedStyle(requiredFixture(closure(), 'closure marker')).pointerEvents).toBe('none');
  };

  const thenTheMarkerStandsAtTheHour = (pointage: string, heure: number): void => {
    const debut = Date.parse(instantAt('07:00'));
    const fin = Date.parse(instantAt('21:00'));
    const attendu = ((new Date(2026, 8, 14, heure).getTime() - debut) / (fin - debut)) * 100;
    expect(Number.parseFloat(marker(pointage).style.left)).toBeCloseTo(attendu);
  };

  const thenTheMarkersAre = (expected: readonly string[]): void => {
    expect(markers().map(marker => marker.dataset['pointage'])).toEqual(expected);
  };

  describe('in a time zone that changes hour', () => {
    const original = process.env['TZ'];

    beforeEach(() => {
      process.env['TZ'] = 'Europe/Paris';
    });

    afterEach(() => {
      if (original === undefined) delete process.env['TZ'];
      else process.env['TZ'] = original;
    });

    it('should graduate every elapsed hour across the hour the clock repeats', async () => {
      const dossier = vueEntreInstants(new Date(Date.UTC(2026, 9, 24, 23, 30)), new Date(Date.UTC(2026, 9, 25, 1, 30)));

      await whenRenderingTheFrise(dossier);

      thenTheNumberOfGraduationsIs(6);
    });

    it('should graduate the extended scale hour by hour across midnight and the hour the clock repeats', async () => {
      const dossier = vueEntreInstants(new Date(Date.UTC(2026, 9, 24, 21, 0)), new Date(Date.UTC(2026, 9, 24, 22, 30)));
      const bornes = {
        min: new Date(Date.UTC(2026, 9, 24, 21, 0)).toISOString(),
        max: new Date(Date.UTC(2026, 9, 25, 1, 30)).toISOString(),
      };

      await whenRenderingTheFrise(
        dossier,
        poigneeFixture('00:00', { instant: new Date(Date.UTC(2026, 9, 24, 22, 30)).toISOString(), bornes }),
      );

      thenTheNumberOfGraduationsIs(7);
      thenTheDaysShownCountIs(1);
    });

    it.each([
      { cas: 'first', instant: new Date(Date.UTC(2026, 9, 25, 0, 30)), texte: '02:30 UTC+02:00' },
      { cas: 'second', instant: new Date(Date.UTC(2026, 9, 25, 1, 30)), texte: '02:30 UTC+01:00' },
    ])('should tell the $cas occurrence of the hour the clock repeats apart in the time of the handle', async ({ instant, texte }) => {
      const dossier = vueEntreInstants(new Date(Date.UTC(2026, 9, 24, 21, 0)), new Date(Date.UTC(2026, 9, 24, 22, 0)));
      const bornes = {
        min: new Date(Date.UTC(2026, 9, 24, 21, 0)).toISOString(),
        max: new Date(Date.UTC(2026, 9, 25, 5, 0)).toISOString(),
      };

      await whenRenderingTheFrise(dossier, poigneeFixture('00:00', { instant: instant.toISOString(), bornes }));

      thenTheHandleIsReadAs(texte);
    });

    it.each([
      { cas: 'first', instant: new Date(Date.UTC(2026, 9, 25, 0, 30)), proposee: 'heure proposée 02:30 UTC+02:00' },
      { cas: 'second', instant: new Date(Date.UTC(2026, 9, 25, 1, 30)), proposee: 'heure proposée 02:30 UTC+01:00' },
    ])(
      'should tell the $cas occurrence of the hour the clock repeats apart in the name of the bar it ends',
      async ({ instant, proposee }) => {
        const debut = new Date(Date.UTC(2026, 9, 24, 21, 0)).toISOString();
        const fin = new Date(Date.UTC(2026, 9, 25, 5, 0)).toISOString();

        await whenRenderingTheFrise(
          vueDe(activiteA('a-1', debut, fin)),
          poigneeFixture('00:00', { instant: instant.toISOString(), bornes: { min: debut, max: fin } }),
        );

        thenTheBarNameEndsWith('a-1', ` · ${proposee}`);
      },
    );

    it('should graduate every two hours the day the clock repeats an hour, without two graduations closer than 64 pixels', async () => {
      await whenRenderingTheFrise(vueEntreInstants(new Date(Date.UTC(2026, 9, 24, 23, 30)), new Date(Date.UTC(2026, 9, 25, 1, 30))));

      await whenTheFriseIsMeasured(200);

      thenTheGraduationsStandAt([0, 40, 100]);
      thenNoTwoGraduationsAreCloserThan(64, 200);
    });

    it('should graduate every three hours the day the clock skips an hour, without two graduations closer than 64 pixels', async () => {
      await whenRenderingTheFrise(vueEntreInstants(new Date(Date.UTC(2026, 2, 28, 23, 30)), new Date(Date.UTC(2026, 2, 29, 2, 30))));

      await whenTheFriseIsMeasured(140);

      thenTheGraduationsStandAt([100 / 6, 100]);
      thenNoTwoGraduationsAreCloserThan(64, 140);
    });
  });

  describe('in a time zone that repeats midnight', () => {
    const original = process.env['TZ'];

    beforeEach(() => {
      process.env['TZ'] = 'America/Havana';
    });

    afterEach(() => {
      if (original === undefined) delete process.env['TZ'];
      else process.env['TZ'] = original;
    });

    it('should keep the second midnight, and drop the graduation before it, when the first one is too close', async () => {
      await whenRenderingTheFrise(vueEntreInstants(new Date(Date.UTC(2026, 10, 1, 2, 0)), new Date(Date.UTC(2026, 10, 1, 8, 0))));

      await whenTheFriseIsMeasured(400);

      thenTheGraduationsStandAt([12.5, 50, 75, 100]);
      thenTheDaysShownCountIs(1);
    });
  });
});
