import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResizeObserverFixture } from '@test/unit/fixtures/gestion/anomalies-de-pointage/ResizeObserverFixture';
import { dataSelector } from '@test/utils/DataSelector';
import { requiredFixture } from '@test/utils/RequiredFixture';
import { instantLocalFixture } from '@test/utils/gestion/anomalies-de-pointage/InstantLocal.fixture';
import { ActiviteAnomalieId } from '../../../domain/dossier/ActiviteAnomalieId';
import { ActiviteAnomalie, PointageAnomalie } from '../../../domain/dossier/DossierAnomalie';
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

const pointageFixture = (id: string, geste: Geste, heure: string, surcharge: Partial<PointageAnomalie> = {}): PointageAnomalie => ({
  id: new PointageAnomalieId(id),
  fait: { ...GESTES[geste], operateur: 'op-camille', instant: instantAt(heure) },
  operateurNom: 'Camille Martin',
  regularisation: false,
  ...surcharge,
});

const pointageLe = (id: string, geste: Geste, jour: number, heure: string): PointageAnomalie => {
  const pointage = pointageFixture(id, geste, heure);
  return { ...pointage, fait: { ...pointage.fait, instant: instantAt(heure, jour) } };
};

const activiteFixture = (
  id: string,
  etat: ActiviteAnomalie['etat'],
  debut: string,
  fin?: string,
  categorie: 'TRAVAIL' | 'NON_CONFORMITE' = 'TRAVAIL',
): ActiviteAnomalie => ({
  id: new ActiviteAnomalieId(id),
  libelle: `Activité ${id}`,
  etat,
  ouvrant: new PointageAnomalieId(`debut-${id}`),
  periode: { categorie, debut: instantAt(debut), ...(fin === undefined ? {} : { fin: instantAt(fin) }) },
});

const poigneeFixture = (heure: string, surcharge: Partial<PoigneeDeFrise> = {}): PoigneeDeFrise => ({
  instant: instantAt(heure),
  activiteVisee: 'travail-8',
  bornes: { min: instantAt('08:00'), max: instantLocalFixture(new Date(2026, 9, 5, 10, 0)) },
  ...surcharge,
});

const placementFixture = (surcharge: Partial<PlacementDeLInstant> = {}): PlacementDeLInstant => ({
  activiteVisee: 'travail-8',
  bornes: { min: instantAt('08:00'), max: instantAt('13:00') },
  ...surcharge,
});

const placementDeLaFixture = (activite: string): PlacementDeLInstant =>
  placementFixture({ activiteVisee: activite, bornes: { min: instantAt('08:00'), max: instantLocalFixture(new Date(2026, 9, 5, 10, 0)) } });

const PLAN_WIDTH = 1000;

type VueDeTest = Omit<VueDeFrise, 'activites'> & { readonly activites?: readonly ActiviteAnomalie[] };

const barreOuvertePar = (pointage: PointageAnomalie): ActiviteAnomalie => ({
  id: new ActiviteAnomalieId(`ouverte-${pointage.id.pointage}`),
  libelle: `Activité ouverte par ${pointage.id.pointage}`,
  etat: 'EN_COURS',
  ouvrant: pointage.id,
  periode: { categorie: 'TRAVAIL', debut: pointage.fait.instant },
});

const dossierDeLaFinAutomatique = (): VueDeTest => ({
  journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:00')],
  activites: [{ ...activiteFixture('travail-8', 'ECHUE', '08:00', '12:00'), ouvrant: new PointageAnomalieId('debut-8') }],
});

const vueAvecUneBarreParRepere = (vue: VueDeTest): VueDeFrise => ({
  ...vue,
  activites: vue.activites ?? vue.journal.filter(pointage => Number.isFinite(Date.parse(pointage.fait.instant))).map(barreOuvertePar),
});

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

  it('should draw one marker per pointage of the journal', async () => {
    const dossier = { journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:00'), pointageFixture('fin-17', 'ARRET', '17:00')] };

    await whenRenderingTheFrise(dossier);

    thenTheMarkersAre(['debut-8', 'fin-17']);
  });

  it('should keep the scale on what is drawn when the journal holds pointages of other days or that open no bar', async () => {
    const debut = pointageFixture('debut-8', 'DEMARRAGE', '08:00');
    const dossier = {
      journal: [
        {
          ...pointageFixture('veille-9', 'DEMARRAGE', '09:00'),
          fait: { ...pointageFixture('x', 'DEMARRAGE', '09:00').fait, instant: instantAt('09:00', 10) },
        },
        debut,
        pointageFixture('fin-11', 'ARRET', '11:00'),
      ],
      activites: [{ ...activiteFixture('travail-8', 'ECHUE', '08:00', '11:00'), ouvrant: debut.id }],
    };

    await whenRenderingTheFrise(dossier);

    thenTheMarkersAre(['debut-8']);
    thenTheGraduationsAre(['07:00', '08:00', '09:00', '10:00', '11:00', '12:00']);
  });

  it('should draw the markers in chronological order whatever the order of the journal', async () => {
    const dossier = {
      journal: [pointageFixture('fin-17', 'ARRET', '17:00'), pointageFixture('debut-8', 'DEMARRAGE', '08:00')],
    };

    await whenRenderingTheFrise(dossier);

    thenTheMarkersAre(['debut-8', 'fin-17']);
  });

  it('should name each marker by the time of its pointage with its seconds and its gesture', async () => {
    const dossier = { journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:00'), pointageFixture('fin-17', 'ARRET', '17:00')] };

    await whenRenderingTheFrise(dossier);

    thenTheMarkerIsNamed('fin-17', '17:00:00 · Arrêt');
    thenTheMarkerIsNamed('debut-8', '08:00:00 · Démarrage');
  });

  it('should say in the name of its marker that the pointage is regularised', async () => {
    const dossier = { journal: [pointageFixture('fin-17', 'ARRET', '17:00', { regularisation: true })] };

    await whenRenderingTheFrise(dossier);

    thenTheMarkerIsNamed('fin-17', '17:00:00 · Arrêt · régularisé');
  });

  it('should mark the marker of a regularised pointage with the badge R and no other', async () => {
    const dossier = {
      journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:00'), pointageFixture('fin-17', 'ARRET', '17:00', { regularisation: true })],
    };

    await whenRenderingTheFrise(dossier);

    thenTheMarkerBadgeIs('fin-17', 'R');
    thenTheMarkerHasNoBadge('debut-8');
  });

  it.each([
    ['DEMARRAGE', '▶'],
    ['DEMARRAGE_NC', '▷'],
    ['ARRET', '■'],
  ] as const)('should draw the %s gesture of a pointage with the symbol %s', async (geste, symbole) => {
    const dossier = { journal: [pointageFixture('p-1', geste, '08:00')] };

    await whenRenderingTheFrise(dossier);

    thenTheMarkerSymbolIs('p-1', symbole);
  });

  it.each([
    ['DEMARRAGE', 'false'],
    ['DEMARRAGE_NC', 'true'],
    ['ARRET', 'false'],
  ] as const)('should flag the marker of a %s gesture as a non-conformity: %s', async (geste, drapeau) => {
    const dossier = { journal: [pointageFixture('p-1', geste, '08:00')] };

    await whenRenderingTheFrise(dossier);

    thenTheMarkerFlagIs('p-1', 'data-non-conformite', drapeau);
  });

  it('should show under each marker the hour and minute of its pointage', async () => {
    const dossier = {
      journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:05'), pointageFixture('fin-17', 'ARRET', '17:00')],
    };

    await whenRenderingTheFrise(dossier);

    thenTheMarkerTimeIs('debut-8', '08:05');
    thenTheMarkerTimeIs('fin-17', '17:00');
  });

  it('should draw one bar per activity, in the order of their start', async () => {
    const dossier = {
      journal: [],
      activites: [activiteFixture('nc-12', 'EN_COURS', '12:00'), activiteFixture('travail-8', 'EN_COURS', '08:00')],
    };

    await whenRenderingTheFrise(dossier);

    thenTheBarsAre(['travail-8', 'nc-12']);
  });

  it.each([
    ['TRAVAIL', 'TERMINEE', 'Travail · Terminée'],
    ['TRAVAIL', 'ECHUE', 'Travail · Fin automatique'],
    ['NON_CONFORMITE', 'EN_COURS', 'Non-conformité · En cours'],
  ] as const)('should write on the bar of a %s activity %s its category and its state: %s', async (categorie, etat, texte) => {
    const dossier = { journal: [], activites: [activiteFixture('a-1', etat, '08:00', undefined, categorie)] };

    await whenRenderingTheFrise(dossier);

    thenTheBarReads('a-1', texte);
  });

  it('should tell the category and the state of a bar by attributes', async () => {
    const dossier = { journal: [], activites: [activiteFixture('nc-9', 'TERMINEE', '09:00', '10:00', 'NON_CONFORMITE')] };

    await whenRenderingTheFrise(dossier);

    thenTheBarAttributeIs('nc-9', 'data-categorie', 'NON_CONFORMITE');
    thenTheBarAttributeIs('nc-9', 'data-etat', 'TERMINEE');
  });

  it.each([
    { etat: 'TERMINEE', fin: '10:00', attendu: 'RECUE' },
    { etat: 'ECHUE', fin: '18:00', attendu: 'AUTOMATIQUE' },
    { etat: 'EN_COURS', fin: undefined, attendu: 'OUVERTE' },
    { etat: 'EN_COURS', fin: '10:00', attendu: 'OUVERTE' },
    { etat: 'ECHUE', fin: undefined, attendu: 'OUVERTE' },
  ] as const)('should end the bar of an activity $etat received with the end $fin as $attendu', async ({ etat, fin, attendu }) => {
    const dossier = { journal: [], activites: [activiteFixture('a-1', etat, '08:00', fin)] };

    await whenRenderingTheFrise(dossier);

    thenTheBarAttributeIs('a-1', 'data-fin', attendu);
  });

  it.each([
    { etat: 'TERMINEE', fin: '17:00', nom: 'Travail · lundi 14 septembre à 08:00 → lundi 14 septembre à 17:00 · Terminée' },
    { etat: 'EN_COURS', fin: undefined, nom: 'Travail · lundi 14 septembre à 08:00 · En cours' },
  ] as const)('should name the bar of an activity $etat by its category, its received period and its state', async ({ etat, fin, nom }) => {
    const dossier = { journal: [], activites: [activiteFixture('a-1', etat, '08:00', fin)] };

    await whenRenderingTheFrise(dossier);

    thenTheBarIsNamed('a-1', nom);
  });

  it('should give an activity without period its row and its label but no bar', async () => {
    const sansPeriode: ActiviteAnomalie = {
      id: new ActiviteAnomalieId('a-1'),
      libelle: 'Travail ouvert à 8 h',
      etat: 'EN_COURS',
      ouvrant: new PointageAnomalieId('debut-a-1'),
    };
    const dossier = { journal: [pointageFixture('fin-17', 'ARRET', '17:00')], activites: [sansPeriode] };

    await whenRenderingTheFrise(dossier);

    thenTheBarReads('a-1', 'Travail ouvert à 8 h');
    thenTheBarAttributeIs('a-1', 'data-fin', null);
  });

  it('should list the activity that holds no period after the bars that have one', async () => {
    const sansPeriode: ActiviteAnomalie = {
      id: new ActiviteAnomalieId('a-1'),
      libelle: 'Travail ouvert à 8 h',
      etat: 'EN_COURS',
      ouvrant: new PointageAnomalieId('debut-a-1'),
    };
    const dossier = { journal: [], activites: [sansPeriode, activiteFixture('a-2', 'TERMINEE', '09:00', '10:00')] };

    await whenRenderingTheFrise(dossier);

    thenTheBarsAre(['a-2', 'a-1']);
  });

  it('should graduate the scale by the hour, from an hour before the first pointage to an hour after the last, rounded to the hour', async () => {
    const dossier = { journal: [pointageFixture('p-1', 'DEMARRAGE', '08:30'), pointageFixture('p-2', 'ARRET', '10:15')] };

    await whenRenderingTheFrise(dossier);

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
    const dossier = { journal: [pointageFixture('p-1', 'DEMARRAGE', '08:00'), pointageFixture('p-2', 'ARRET', '17:00')] };
    await whenRenderingTheFrise(dossier);

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
    const dossier = {
      journal: [pointageLe('p-1', 'DEMARRAGE', 14, '08:00'), pointageLe('p-2', 'ARRET', 17, '17:00')],
    };
    await whenRenderingTheFrise(dossier);

    await whenTheFriseIsMeasured(largeur);

    thenTheGraduationsAre(jours.map(() => '00:00'));
    thenTheDaysShownAre(jours);
  });

  it('should graduate the midnight that opens a week counted from the start of the scale', async () => {
    const dossier = {
      journal: [pointageLe('p-1', 'DEMARRAGE', 14, '08:00'), pointageLe('p-2', 'ARRET', 23, '17:00')],
    };
    await whenRenderingTheFrise(dossier);

    await whenTheFriseIsMeasured(100);

    thenTheDaysShownAre(['lun. 21 sept.']);
  });

  it('should graduate the hours the way it did when the frise is wide, as the reference width leaves 64 pixels per hour', async () => {
    const dossier = { journal: [pointageFixture('p-1', 'DEMARRAGE', '08:00'), pointageFixture('p-2', 'ARRET', '17:00')] };

    await whenRenderingTheFrise(dossier);

    thenTheNumberOfGraduationsIs(12);
  });

  it('should take a new measure of its host into account', async () => {
    const dossier = { journal: [pointageFixture('p-1', 'DEMARRAGE', '08:00'), pointageFixture('p-2', 'ARRET', '17:00')] };
    await whenRenderingTheFrise(dossier);
    await whenTheFriseIsMeasured(150);

    await whenTheFriseIsMeasured(704);

    thenTheNumberOfGraduationsIs(12);
  });

  it('should ignore a measure of zero width', async () => {
    const dossier = { journal: [pointageFixture('p-1', 'DEMARRAGE', '08:00'), pointageFixture('p-2', 'ARRET', '17:00')] };
    await whenRenderingTheFrise(dossier);
    await whenTheFriseIsMeasured(150);

    await whenTheFriseIsMeasured(0);

    thenTheGraduationsAre(['12:00', '18:00']);
  });

  it('should stop observing the size of its host when destroyed', async () => {
    const dossier = { journal: [pointageFixture('p-1', 'DEMARRAGE', '08:00')] };
    await whenRenderingTheFrise(dossier);

    whenDestroyingTheFrise();

    expect(resizeObserver.observantUnElement).toBe(false);
  });

  it('should keep the exact time of a marker on a narrow frise, whatever the room its position leaves', async () => {
    const dossier = { journal: [pointageFixture('p-1', 'DEMARRAGE', '08:00'), pointageFixture('p-2', 'ARRET', '17:00')] };
    await whenRenderingTheFrise(dossier);

    await whenTheFriseIsMeasured(100);

    thenTheMarkerTimeIs('p-1', '08:00');
    thenTheMarkerTimeIs('p-2', '17:00');
  });

  it('should keep the exact time of the handle on a narrow frise, whatever the room its position leaves', async () => {
    const dossier = dossierDeLaFinAutomatique();
    await whenRenderingTheFrise(dossier, poigneeFixture('10:45'));

    await whenTheFriseIsMeasured(100);

    thenTheHandleIsReadAs('10:45');
  });

  it('should not shift the handle under the pointer when it is grabbed while held away from the edge', async () => {
    const dossier = dossierDeLaFinAutomatique();
    await whenRenderingTheFrise(dossier, poigneeFixture('10:45'));
    await whenTheFriseIsMeasured(100);

    whenDraggingTheHandle({ from: 780, to: 780 });

    thenTheMovesAsked([{ kind: 'VERS', instant: new Date(2026, 8, 14, 10, 45).getTime() }]);
  });

  it('should reach the start and the end of the activities received, not a stop that opens no bar, when graduating the scale', async () => {
    const dossier = {
      journal: [pointageFixture('p-1', 'ARRET', '10:00')],
      activites: [activiteFixture('a-1', 'TERMINEE', '06:00', '08:00')],
    };

    await whenRenderingTheFrise(dossier);

    thenTheGraduationsAre(['05:00', '06:00', '07:00', '08:00', '09:00']);
  });

  it('should show the day at midnight when the sequence spans several days', async () => {
    const dossier = {
      journal: [
        pointageFixture('p-1', 'DEMARRAGE', '22:00'),
        {
          ...pointageFixture('p-2', 'ARRET', '02:00'),
          fait: { ...pointageFixture('p-2', 'ARRET', '02:00').fait, instant: instantAt('02:00', 15) },
        },
      ],
    };

    await whenRenderingTheFrise(dossier);

    thenTheGraduationsAre(['21:00', '22:00', '23:00', '00:00', '01:00', '02:00', '03:00']);
    thenTheDaysShownAre(['mar. 15 sept.']);
  });

  it('should show no day on a sequence that crosses no midnight', async () => {
    const dossier = { journal: [pointageFixture('p-1', 'DEMARRAGE', '08:00'), pointageFixture('p-2', 'ARRET', '17:00')] };

    await whenRenderingTheFrise(dossier);

    thenTheDaysShownAre([]);
  });

  it('should draw the frise of a dossier that holds a pointage', async () => {
    const dossier = { journal: [pointageFixture('p-1', 'ARRET', '17:00')] };

    await whenRenderingTheFrise(dossier);

    thenTheFriseIsDrawn();
  });

  it('should draw nothing for a dossier that holds neither pointage nor activity', async () => {
    const dossier = { journal: [] };

    await whenRenderingTheFrise(dossier);

    thenNoFriseIsDrawn();
  });

  it('should still list an activity that holds no period when the dossier holds no instant at all', async () => {
    const sansPeriode: ActiviteAnomalie = {
      id: new ActiviteAnomalieId('a-1'),
      libelle: 'Travail ouvert à 8 h',
      etat: 'EN_COURS',
      ouvrant: new PointageAnomalieId('debut-a-1'),
    };

    await whenRenderingTheFrise({ journal: [], activites: [sansPeriode] });

    thenTheBarReads('a-1', 'Travail ouvert à 8 h');
  });

  it('should draw no marker for a pointage whose instant it cannot read, nor let it spoil the scale', async () => {
    const illisible = pointageFixture('p-1', 'ARRET', '17:00');
    const dossier = {
      journal: [{ ...illisible, fait: { ...illisible.fait, instant: 'illisible' } }, pointageFixture('p-2', 'DEMARRAGE', '08:00')],
    };

    await whenRenderingTheFrise(dossier);

    thenTheMarkersAre(['p-2']);
    thenTheGraduationsAre(['07:00', '08:00', '09:00']);
  });

  it('should be tall enough for its lowest element', async () => {
    const dossier = {
      journal: [pointageFixture('p-1', 'DEMARRAGE', '08:00'), pointageFixture('p-2', 'ARRET', '08:10')],
      activites: [activiteFixture('a-1', 'EN_COURS', '08:00'), activiteFixture('a-2', 'EN_COURS', '09:00')],
    };

    await whenRenderingTheFrise(dossier);

    expect(Number.parseFloat(thePlan().style.height)).toBeGreaterThanOrEqual(topOf(bar('a-2')) + 44);
  });

  it('should ask to place the instant where the pointages row is clicked', async () => {
    const dossier = dossierDeLaFinAutomatique();
    await whenRenderingTheFrise(dossier, undefined, placementFixture());

    whenClickingThePlacementRowAt(500);

    thenThePlacementsAsked([new Date(2026, 8, 14, 10, 0).getTime()]);
  });

  it.each([
    { cas: 'down to the nearest five minutes', clientX: 504, heure: new Date(2026, 8, 14, 10, 0) },
    { cas: 'up to the nearest five minutes', clientX: 513, heure: new Date(2026, 8, 14, 10, 5) },
  ])('should round the instant of the click $cas', async ({ clientX, heure }) => {
    const dossier = dossierDeLaFinAutomatique();
    await whenRenderingTheFrise(dossier, undefined, placementFixture());

    whenClickingThePlacementRowAt(clientX);

    thenThePlacementsAsked([heure.getTime()]);
  });

  it('should draw no placement row while no instant waits to be placed', async () => {
    const dossier = dossierDeLaFinAutomatique();

    await whenRenderingTheFrise(dossier);

    thenNoPlacementRowIsDrawn();
  });

  it('should extend the scale to three hours after the last received instant while an instant waits to be placed', async () => {
    const dossier = dossierDeLaFinAutomatique();

    await whenRenderingTheFrise(
      dossier,
      undefined,
      placementFixture({ bornes: { min: instantAt('08:00'), max: instantLocalFixture(new Date(2026, 9, 5, 10, 0)) } }),
    );

    thenTheGraduationsAre(['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00']);
  });

  it('should draw the handle of the proposed instant as a slider', async () => {
    const dossier = dossierDeLaFinAutomatique();

    await whenRenderingTheFrise(dossier, poigneeFixture('12:00'));

    thenTheHandleIsASlider();
  });

  it('should extend the scale to three hours after the last received instant while a handle is active', async () => {
    const dossier = dossierDeLaFinAutomatique();

    await whenRenderingTheFrise(dossier, poigneeFixture('10:00'));

    thenTheGraduationsAre(['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00']);
  });

  it('should keep the normal scale when the clock stands before the last received instant', async () => {
    const dossier = dossierDeLaFinAutomatique();

    await whenRenderingTheFrise(dossier, poigneeFixture('10:00', { bornes: { min: instantAt('08:00'), max: instantAt('10:00') } }));

    thenTheGraduationsAre(['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00']);
  });

  it('should extend the scale only up to the hour that follows the clock', async () => {
    const dossier = dossierDeLaFinAutomatique();

    await whenRenderingTheFrise(dossier, poigneeFixture('10:00', { bornes: { min: instantAt('08:00'), max: instantAt('14:20') } }));

    thenTheGraduationsAre(['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00']);
  });

  it.each([
    { cas: 'after', instant: new Date(2026, 8, 20, 10, 0), tenue: new Date(2026, 8, 14, 15, 0) },
    { cas: 'before', instant: new Date(2026, 8, 10, 10, 0), tenue: new Date(2026, 8, 14, 8, 0) },
  ])(
    'should hold the handle at the nearest end of its range on the scale when it stands $cas every received instant',
    async ({ instant, tenue }) => {
      const dossier = dossierDeLaFinAutomatique();

      await whenRenderingTheFrise(dossier, poigneeFixture('10:00', { instant: instantLocalFixture(instant) }));

      thenTheHandleHoldsAt(tenue);
    },
  );

  it('should give the handle a range, a value and a readable time within its bounds', async () => {
    const dossier = dossierDeLaFinAutomatique();

    await whenRenderingTheFrise(dossier, poigneeFixture('10:05', { bornes: { min: instantAt('08:00'), max: instantAt('13:00') } }));

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
    const dossier = dossierDeLaFinAutomatique();
    await whenRenderingTheFrise(dossier, poigneeFixture('10:00'));

    whenPressingKeyOnTheHandle(touche, maj);

    thenTheMovesAsked([demande]);
  });

  it('should leave the other keys to the browser so that the tab key still leaves the handle', async () => {
    const dossier = dossierDeLaFinAutomatique();
    await whenRenderingTheFrise(dossier, poigneeFixture('10:00'));

    const touche = whenPressingKeyOnTheHandle('Tab');

    thenTheMovesAsked([]);
    thenTheKeyIsLeftToTheBrowser(touche);
  });

  it('should ask to move the handle to the instant under the pointer dragging it', async () => {
    const dossier = dossierDeLaFinAutomatique();
    await whenRenderingTheFrise(dossier, poigneeFixture('10:00', { bornes: { min: instantAt('08:00'), max: instantAt('13:00') } }));

    whenDraggingTheHandle({ from: 500, to: 750 });

    thenTheMovesAsked([{ kind: 'VERS', instant: new Date(2026, 8, 14, 11, 30).getTime() }]);
  });

  it.each([
    { cas: 'down to the nearest five minutes', to: 756, heure: new Date(2026, 8, 14, 11, 30) },
    { cas: 'up to the nearest five minutes', to: 762, heure: new Date(2026, 8, 14, 11, 35) },
  ])('should round the instant under the pointer $cas', async ({ to, heure }) => {
    const dossier = dossierDeLaFinAutomatique();
    await whenRenderingTheFrise(dossier, poigneeFixture('10:00', { bornes: { min: instantAt('08:00'), max: instantAt('13:00') } }));

    whenDraggingTheHandle({ from: 500, to });

    thenTheMovesAsked([{ kind: 'VERS', instant: heure.getTime() }]);
  });

  it('should keep the point of the handle that was grabbed under the pointer instead of jumping to its centre', async () => {
    const dossier = dossierDeLaFinAutomatique();
    await whenRenderingTheFrise(dossier, poigneeFixture('10:00', { bornes: { min: instantAt('08:00'), max: instantAt('13:00') } }));

    whenDraggingTheHandle({ from: 520, to: 770 });

    thenTheMovesAsked([{ kind: 'VERS', instant: new Date(2026, 8, 14, 11, 30).getTime() }]);
  });

  it('should ignore a pointer that moves over the handle without having pressed it', async () => {
    const dossier = dossierDeLaFinAutomatique();
    await whenRenderingTheFrise(dossier, poigneeFixture('10:00', { bornes: { min: instantAt('08:00'), max: instantAt('13:00') } }));

    whenMovingThePointerOverTheHandleTo(750);

    thenTheMovesAsked([]);
  });

  it.each(['pointerup', 'pointercancel'])('should stop following the pointer once it ends with %s', async fin => {
    const dossier = dossierDeLaFinAutomatique();
    await whenRenderingTheFrise(dossier, poigneeFixture('10:00', { bornes: { min: instantAt('08:00'), max: instantAt('13:00') } }));
    whenDraggingTheHandle({ from: 500, to: 750 });

    whenTheGestureEndsWith(fin);
    whenMovingThePointerOverTheHandleTo(900);

    thenTheMovesAsked([{ kind: 'VERS', instant: new Date(2026, 8, 14, 11, 30).getTime() }]);
  });

  it('should capture the pointer that presses the handle so that the drag goes on outside of it', async () => {
    const dossier = dossierDeLaFinAutomatique();
    await whenRenderingTheFrise(dossier, poigneeFixture('10:00', { bornes: { min: instantAt('08:00'), max: instantAt('13:00') } }));
    const captured = givenTheBrowserCapturesPointers();

    whenPressingTheHandleAt(500, 7);

    expect(captured).toEqual([7]);
  });

  it('should name the handle and show the time it stands at', async () => {
    const dossier = dossierDeLaFinAutomatique();

    await whenRenderingTheFrise(dossier, poigneeFixture('10:05'));

    thenTheHandleIsNamedAndShows('Heure proposée du fait', '10:05');
  });

  describe('of an automatic end', () => {
    it('should lay an automatic end with one row per activity and its start marker on the start of its bar', async () => {
      const dossier = {
        journal: [pointageFixture('debut-a-1', 'DEMARRAGE', '08:00'), pointageFixture('debut-a-2', 'DEMARRAGE', '12:00')],
        activites: [activiteFixture('a-1', 'TERMINEE', '08:00', '11:00'), activiteFixture('a-2', 'ECHUE', '12:00', '21:00')],
      };

      await whenRenderingTheFrise(dossier);

      thenTheBarsStandOnRowsAt([36, 88]);
      thenTheStartMarkerStandsOnTheStartOfItsBar('debut-a-1', 'a-1');
      thenTheStartMarkerStandsOnTheStartOfItsBar('debut-a-2', 'a-2');
    });

    it('should stand the handle on the row of the bar it terminates, without a row of its own', async () => {
      const dossier = {
        journal: [pointageFixture('debut-a-1', 'DEMARRAGE', '08:00'), pointageFixture('debut-a-2', 'DEMARRAGE', '12:00')],
        activites: [activiteFixture('a-1', 'TERMINEE', '08:00', '11:00'), activiteFixture('a-2', 'ECHUE', '12:00', '21:00')],
      };

      await whenRenderingTheFrise(dossier, poigneeFixture('17:00', { activiteVisee: 'a-2' }));

      expect(topOf(handle())).toBe(88);
      thenTheBarsStandOnRowsAt([36, 88]);
    });

    it('should draw no handle for an hour that terminates no activity of the dossier', async () => {
      const dossier = {
        journal: [pointageFixture('debut-a-1', 'DEMARRAGE', '08:00')],
        activites: [activiteFixture('a-1', 'ECHUE', '08:00', '21:00')],
      };

      await whenRenderingTheFrise(dossier, poigneeFixture('17:00', { activiteVisee: 'ailleurs' }));

      thenNoHandleIsDrawn();
      thenTheBarsStandOnRowsAt([36]);
      thenTheBarAttributeIs('a-1', 'data-fin', 'AUTOMATIQUE');
    });

    it('should lay the placement row on the row of the bar the instant will terminate, without a row of its own', async () => {
      const dossier = {
        journal: [pointageFixture('debut-a-1', 'DEMARRAGE', '08:00')],
        activites: [activiteFixture('a-1', 'ECHUE', '08:00', '21:00')],
      };

      await whenRenderingTheFrise(dossier, undefined, placementFixture({ activiteVisee: 'a-1' }));

      thenThePlacementRowStandsAt({ top: 36, height: 44 });
      thenTheBarsStandOnRowsAt([36]);
    });

    it('should stand an hourless handle at the received end of the bar it will terminate, in the tab order and read as holding no hour', async () => {
      const dossier = {
        journal: [pointageFixture('debut-a-1', 'DEMARRAGE', '08:00')],
        activites: [activiteFixture('a-1', 'ECHUE', '08:00', '12:00')],
      };

      await whenRenderingTheFrise(dossier, undefined, placementDeLaFixture('a-1'));

      thenTheHandleStandsAt({ left: '62.5%', onTheRowOf: 'a-1' });
      thenTheHandleIsHourless('Heure ?');
      thenTheHandleIsASliderInTheTabOrderWithNoHour();
      thenTheAutomaticEndsDrawnAre([]);
      thenNoPartIsRemoved();
    });

    it('should ask to place the instant where the hourless handle is dragged to', async () => {
      const dossier = {
        journal: [pointageFixture('debut-a-1', 'DEMARRAGE', '08:00')],
        activites: [activiteFixture('a-1', 'ECHUE', '08:00', '12:00')],
      };
      await whenRenderingTheFrise(dossier, undefined, placementDeLaFixture('a-1'));

      whenDraggingTheHandle({ from: 625, to: 750 });

      thenThePlacementsAsked([new Date(2026, 8, 14, 13, 0).getTime()]);
      thenTheMovesAsked([]);
    });

    it('should ask for nothing when the hourless handle is pressed and released without moving', async () => {
      const dossier = {
        journal: [pointageFixture('debut-a-1', 'DEMARRAGE', '08:00')],
        activites: [activiteFixture('a-1', 'ECHUE', '08:00', '12:00')],
      };
      await whenRenderingTheFrise(dossier, undefined, placementDeLaFixture('a-1'));

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
        const dossier = {
          journal: [pointageFixture('debut-a-1', 'DEMARRAGE', '08:00')],
          activites: [activiteFixture('a-1', 'ECHUE', '08:00', '12:00')],
        };
        await whenRenderingTheFrise(dossier, undefined, placementDeLaFixture('a-1'));

        const pressee = whenPressingKeyOnTheHandle(touche, maj);

        thenThePlacementDemandsAsked([demande]);
        thenTheMovesAsked([]);
        expect(pressee.defaultPrevented).toBe(true);
      },
    );

    it('should leave the other keys to the browser on the hourless handle', async () => {
      const dossier = {
        journal: [pointageFixture('debut-a-1', 'DEMARRAGE', '08:00')],
        activites: [activiteFixture('a-1', 'ECHUE', '08:00', '12:00')],
      };
      await whenRenderingTheFrise(dossier, undefined, placementDeLaFixture('a-1'));

      const touche = whenPressingKeyOnTheHandle('Tab');

      thenThePlacementsAsked([]);
      thenTheKeyIsLeftToTheBrowser(touche);
    });

    it('should keep the same element for the handle once its first move gave the fact an hour', async () => {
      const dossier = {
        journal: [pointageFixture('debut-a-1', 'DEMARRAGE', '08:00')],
        activites: [activiteFixture('a-1', 'ECHUE', '08:00', '12:00')],
      };
      await whenRenderingTheFrise(dossier, undefined, placementDeLaFixture('a-1'));
      const hourlessHandle = handle();
      const touchedNodes = givenTheNodesOfThePlanAreWatched();

      await whenTheFactGetsItsHour(poigneeFixture('13:00', { activiteVisee: 'a-1', bornes: placementDeLaFixture('a-1').bornes }));

      expect(handle()).toBe(hourlessHandle);
      expect(touchedNodes()).not.toContain(hourlessHandle);
      thenTheHandleHoldsAt(new Date(2026, 8, 14, 13, 0));
      thenTheHandleIsASliderInTheTabOrder();
    });

    it('should go on moving the handle within the same gesture once the first move gave the fact an hour', async () => {
      const dossier = {
        journal: [pointageFixture('debut-a-1', 'DEMARRAGE', '08:00')],
        activites: [activiteFixture('a-1', 'ECHUE', '08:00', '12:00')],
      };
      await whenRenderingTheFrise(dossier, undefined, placementDeLaFixture('a-1'));
      whenDraggingTheHandle({ from: 625, to: 750 });
      await whenTheFactGetsItsHour(poigneeFixture('13:00', { activiteVisee: 'a-1', bornes: placementDeLaFixture('a-1').bornes }));

      whenMovingThePointerOverTheHandleTo(875);

      thenTheMovesAsked([{ kind: 'VERS', instant: new Date(2026, 8, 14, 14, 0).getTime() }]);
    });

    it('should ask to place the instant where the row of the aimed bar is clicked beyond the bar', async () => {
      const dossier = {
        journal: [pointageFixture('debut-a-1', 'DEMARRAGE', '08:00')],
        activites: [activiteFixture('a-1', 'ECHUE', '08:00', '12:00')],
      };
      await whenRenderingTheFrise(dossier, undefined, placementDeLaFixture('a-1'));

      whenClickingThePlacementRowAt(750);

      thenThePlacementsAsked([new Date(2026, 8, 14, 13, 0).getTime()]);
    });

    it('should stand no hourless handle on a bar that holds no received end', async () => {
      const dossier = {
        journal: [pointageFixture('debut-a-1', 'DEMARRAGE', '08:00')],
        activites: [activiteFixture('a-1', 'EN_COURS', '08:00')],
      };

      await whenRenderingTheFrise(dossier, undefined, placementDeLaFixture('a-1'));

      thenNoHandleIsDrawn();
    });

    it('should stand no hourless handle for an hour that waits to terminate no activity of the dossier', async () => {
      const dossier = {
        journal: [pointageFixture('debut-a-1', 'DEMARRAGE', '08:00')],
        activites: [activiteFixture('a-1', 'ECHUE', '08:00', '12:00')],
      };

      await whenRenderingTheFrise(dossier, undefined, placementDeLaFixture('ailleurs'));

      thenNoHandleIsDrawn();
      thenNoPlacementRowIsDrawn();
    });

    it('should end the bar the handle terminates at the time the handle stands at', async () => {
      const dossier = {
        journal: [pointageFixture('debut-a-1', 'DEMARRAGE', '08:00')],
        activites: [activiteFixture('a-1', 'ECHUE', '08:00', '12:00')],
      };

      await whenRenderingTheFrise(dossier, poigneeFixture('10:00', { activiteVisee: 'a-1' }));

      thenTheBarSpans('a-1', { left: '12.5%', width: '25%' });
      thenTheHandleStandsAt({ left: '37.5%', onTheRowOf: 'a-1' });
      thenTheBarAttributeIs('a-1', 'data-fin', 'PROPOSEE');
      thenTheBarIsNamed(
        'a-1',
        'Travail · lundi 14 septembre à 08:00 → lundi 14 septembre à 12:00 · Fin automatique · heure proposée 10:00',
      );
    });

    it('should draw the part the handle removes up to the received end', async () => {
      const dossier = {
        journal: [pointageFixture('debut-a-1', 'DEMARRAGE', '08:00')],
        activites: [activiteFixture('a-1', 'ECHUE', '08:00', '12:00')],
      };

      await whenRenderingTheFrise(dossier, poigneeFixture('10:00', { activiteVisee: 'a-1' }));

      thenTheRemovedPartSpans({ left: '37.5%', width: '25%' });
      thenTheRemovedPartStandsOnTheRowOf('a-1');
      thenTheRemovedPartIsDecorative();
    });

    it('should lengthen the bar past its received end when the handle stands after it, with nothing removed', async () => {
      const dossier = {
        journal: [pointageFixture('debut-a-1', 'DEMARRAGE', '08:00')],
        activites: [activiteFixture('a-1', 'ECHUE', '08:00', '12:00')],
      };

      await whenRenderingTheFrise(dossier, poigneeFixture('14:00', { activiteVisee: 'a-1' }));

      thenTheBarSpans('a-1', { left: '12.5%', width: '75%' });
      thenNoPartIsRemoved();
    });

    it('should remove nothing from a bar that is still open', async () => {
      const dossier = {
        journal: [pointageFixture('debut-a-1', 'DEMARRAGE', '08:00')],
        activites: [activiteFixture('a-1', 'EN_COURS', '08:00')],
      };

      await whenRenderingTheFrise(dossier, poigneeFixture('10:00', { activiteVisee: 'a-1' }));

      thenTheBarAttributeIs('a-1', 'data-fin', 'PROPOSEE');
      thenNoPartIsRemoved();
    });

    it('should draw the automatic end of an expired aimed activity while the handle is active, and none for another one', async () => {
      const dossier = {
        journal: [pointageFixture('debut-a-1', 'DEMARRAGE', '08:00'), pointageFixture('debut-a-2', 'DEMARRAGE', '08:30')],
        activites: [activiteFixture('a-1', 'ECHUE', '08:00', '12:00'), activiteFixture('a-2', 'ECHUE', '08:30', '11:00')],
      };

      await whenRenderingTheFrise(dossier, poigneeFixture('10:00', { activiteVisee: 'a-1' }));

      thenTheAutomaticEndsDrawnAre(['Fin automatique 12:00']);
      thenTheAutomaticEndStands({ left: '62.5%', onTheRowOf: 'a-1' });
      thenTheAutomaticEndIsDecorative();
    });

    it('should draw no automatic end for an aimed activity that was not ended automatically', async () => {
      const dossier = {
        journal: [pointageFixture('debut-a-1', 'DEMARRAGE', '08:00')],
        activites: [activiteFixture('a-1', 'TERMINEE', '08:00', '12:00')],
      };

      await whenRenderingTheFrise(dossier, poigneeFixture('10:00', { activiteVisee: 'a-1' }));

      thenTheAutomaticEndsDrawnAre([]);
    });

    it('should draw no automatic end while no handle is active', async () => {
      const dossier = {
        journal: [pointageFixture('debut-a-1', 'DEMARRAGE', '08:00')],
        activites: [activiteFixture('a-1', 'ECHUE', '08:00', '12:00')],
      };

      await whenRenderingTheFrise(dossier);

      thenTheAutomaticEndsDrawnAre([]);
    });

    it('should keep on a marker laid on its bar its name, its symbol, its hour and its badge', async () => {
      const dossier = {
        journal: [pointageFixture('debut-a-1', 'DEMARRAGE', '08:00', { regularisation: true })],
        activites: [activiteFixture('a-1', 'TERMINEE', '08:00', '11:00')],
      };

      await whenRenderingTheFrise(dossier);

      thenTheMarkerIsNamed('debut-a-1', '08:00:00 · Démarrage · régularisé');
      thenTheMarkerSymbolIs('debut-a-1', '▶');
      thenTheMarkerTimeIs('debut-a-1', '08:00');
      thenTheMarkerBadgeIs('debut-a-1', 'R');
    });

    it('should draw no marker for a pointage that opens no bar, a stop included', async () => {
      const dossier = {
        journal: [pointageFixture('debut-a-1', 'DEMARRAGE', '08:00'), pointageFixture('fin-tardive', 'ARRET', '23:00')],
        activites: [activiteFixture('a-1', 'ECHUE', '08:00', '21:00')],
      };

      await whenRenderingTheFrise(dossier);

      thenTheMarkersAre(['debut-a-1']);
    });

    it('should draw the markers and the bars as images, with no button, out of the tab order', async () => {
      const dossier = {
        journal: [pointageFixture('debut-a-1', 'DEMARRAGE', '08:00'), pointageFixture('debut-a-2', 'DEMARRAGE', '09:00')],
        activites: [activiteFixture('a-1', 'ECHUE', '08:00', '12:00'), activiteFixture('a-2', 'TERMINEE', '09:00', '10:00')],
      };

      await whenRenderingTheFrise(dossier);

      thenTheMarkersAndTheBarsAreImages(['debut-a-1', 'debut-a-2'], ['a-1', 'a-2']);
      thenTheTabOrderIs([]);
    });

    it('should let the pointer through the markers and the bars to the placement row under them', async () => {
      const dossier = {
        journal: [pointageFixture('debut-a-1', 'DEMARRAGE', '08:00'), pointageFixture('debut-a-2', 'DEMARRAGE', '09:00')],
        activites: [activiteFixture('a-1', 'ECHUE', '08:00', '12:00'), activiteFixture('a-2', 'TERMINEE', '09:00', '10:00')],
      };

      await whenRenderingTheFrise(dossier, undefined, placementDeLaFixture('a-1'));

      thenThePointerGoesThroughTheMarkersAndTheBars(['debut-a-1', 'debut-a-2'], ['a-1', 'a-2']);
    });

    it('should leave the handle the only element of the focus order, still a slider that moves with the keys', async () => {
      await whenRenderingTheFrise(dossierDeLaFinAutomatique(), poigneeFixture('10:00'));

      whenPressingKeyOnTheHandle('ArrowLeft');

      thenTheFocusOrderIs(['Heure proposée du fait']);
      thenTheHandleIsASlider();
      thenTheMovesAsked([{ kind: 'DE', minutes: -1 }]);
    });
  });

  const whenRenderingTheFrise = async (dossier: VueDeTest, poignee?: PoigneeDeFrise, placement?: PlacementDeLInstant): Promise<void> => {
    fixture = TestBed.createComponent(FriseDossier);
    fixture.componentRef.setInput('dossier', vueAvecUneBarreParRepere(dossier));
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

  const thenNoHandleIsDrawn = (): void => {
    expect((fixture.nativeElement as HTMLElement).querySelector(dataSelector('anomalie-poignee'))).toBeNull();
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

  const badgeOf = (pointage: string): HTMLElement | null =>
    marker(pointage).querySelector<HTMLElement>(dataSelector('anomalie-pointage-regularise'));

  const thenTheMarkerBadgeIs = (pointage: string, expected: string): void => {
    expect(badgeOf(pointage)?.textContent.trim()).toBe(expected);
  };

  const thenTheMarkerHasNoBadge = (pointage: string): void => {
    expect(badgeOf(pointage)).toBeNull();
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

  const thenTheBarsAre = (expected: readonly string[]): void => {
    expect(bars().map(bar => bar.dataset['activite'])).toEqual(expected);
  };

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

  const thenTheFriseIsDrawn = (): void => {
    expect((fixture.nativeElement as HTMLElement).querySelector(dataSelector('anomalie-frise'))).not.toBeNull();
  };

  const thenNoFriseIsDrawn = (): void => {
    expect((fixture.nativeElement as HTMLElement).querySelector(dataSelector('anomalie-frise'))).toBeNull();
  };

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
      const avantLeChangement = pointageFixture('p-1', 'DEMARRAGE', '00:00', { fait: pointageFixture('p-1', 'DEMARRAGE', '00:00').fait });
      const dossier = {
        journal: [
          { ...avantLeChangement, fait: { ...avantLeChangement.fait, instant: new Date(Date.UTC(2026, 9, 24, 23, 30)).toISOString() } },
          {
            ...avantLeChangement,
            id: new PointageAnomalieId('p-2'),
            fait: { ...avantLeChangement.fait, instant: new Date(Date.UTC(2026, 9, 25, 1, 30)).toISOString() },
          },
        ],
      };

      await whenRenderingTheFrise(dossier);

      thenTheNumberOfGraduationsIs(6);
    });

    it('should graduate the extended scale hour by hour across midnight and the hour the clock repeats', async () => {
      const pointage = (id: string, instant: Date): PointageAnomalie => ({
        ...pointageFixture(id, 'DEMARRAGE', '00:00'),
        fait: { ...pointageFixture(id, 'DEMARRAGE', '00:00').fait, instant: instant.toISOString() },
      });
      const dossier = {
        journal: [pointage('p-1', new Date(Date.UTC(2026, 9, 24, 21, 0))), pointage('p-2', new Date(Date.UTC(2026, 9, 24, 22, 30)))],
      };
      const bornes = {
        min: new Date(Date.UTC(2026, 9, 24, 21, 0)).toISOString(),
        max: new Date(Date.UTC(2026, 9, 25, 12, 0)).toISOString(),
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
      const dossier = {
        journal: [
          {
            ...pointageFixture('p-1', 'DEMARRAGE', '00:00'),
            fait: { ...pointageFixture('p-1', 'DEMARRAGE', '00:00').fait, instant: new Date(Date.UTC(2026, 9, 24, 21, 0)).toISOString() },
          },
        ],
        activites: [
          {
            ...activiteFixture('travail-8', 'EN_COURS', '00:00'),
            ouvrant: new PointageAnomalieId('p-1'),
            periode: { categorie: 'TRAVAIL' as const, debut: new Date(Date.UTC(2026, 9, 24, 21, 0)).toISOString() },
          },
        ],
      };
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
        const activite: ActiviteAnomalie = {
          ...activiteFixture('a-1', 'ECHUE', '00:00'),
          periode: { categorie: 'TRAVAIL', debut, fin },
        };
        const dossier = {
          journal: [
            {
              ...pointageFixture('debut-a-1', 'DEMARRAGE', '00:00'),
              fait: { ...pointageFixture('x', 'DEMARRAGE', '00:00').fait, instant: debut },
            },
          ],
          activites: [activite],
        };

        await whenRenderingTheFrise(
          dossier,
          poigneeFixture('00:00', { instant: instant.toISOString(), activiteVisee: 'a-1', bornes: { min: debut, max: fin } }),
        );

        thenTheBarNameEndsWith('a-1', ` · ${proposee}`);
      },
    );

    it('should graduate every two hours the day the clock repeats an hour, without two graduations closer than 64 pixels', async () => {
      const dossier = {
        journal: [unPointageA('p-1', new Date(Date.UTC(2026, 9, 24, 23, 30))), unPointageA('p-2', new Date(Date.UTC(2026, 9, 25, 1, 30)))],
      };
      await whenRenderingTheFrise(dossier);

      await whenTheFriseIsMeasured(200);

      thenTheGraduationsStandAt([0, 40, 100]);
      thenNoTwoGraduationsAreCloserThan(64, 200);
    });

    it('should graduate every three hours the day the clock skips an hour, without two graduations closer than 64 pixels', async () => {
      const dossier = {
        journal: [unPointageA('p-1', new Date(Date.UTC(2026, 2, 28, 23, 30))), unPointageA('p-2', new Date(Date.UTC(2026, 2, 29, 2, 30)))],
      };
      await whenRenderingTheFrise(dossier);

      await whenTheFriseIsMeasured(140);

      thenTheGraduationsStandAt([100 / 6, 100]);
      thenNoTwoGraduationsAreCloserThan(64, 140);
    });

    const unPointageA = (id: string, instant: Date): PointageAnomalie => ({
      ...pointageFixture(id, 'DEMARRAGE', '00:00'),
      fait: { ...pointageFixture(id, 'DEMARRAGE', '00:00').fait, instant: instant.toISOString() },
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
      const unPointageA = (id: string, instant: Date): PointageAnomalie => ({
        ...pointageFixture(id, 'DEMARRAGE', '00:00'),
        fait: { ...pointageFixture(id, 'DEMARRAGE', '00:00').fait, instant: instant.toISOString() },
      });
      const dossier = {
        journal: [unPointageA('p-1', new Date(Date.UTC(2026, 10, 1, 2, 0))), unPointageA('p-2', new Date(Date.UTC(2026, 10, 1, 8, 0)))],
      };
      await whenRenderingTheFrise(dossier);

      await whenTheFriseIsMeasured(400);

      thenTheGraduationsStandAt([12.5, 50, 75, 100]);
      thenTheDaysShownCountIs(1);
    });
  });
});
