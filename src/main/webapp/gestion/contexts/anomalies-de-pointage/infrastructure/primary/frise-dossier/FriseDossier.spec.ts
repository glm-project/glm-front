import { ComponentFixture, TestBed } from '@angular/core/testing';
import { dataSelector } from '@test/utils/DataSelector';
import { requiredFixture } from '@test/utils/RequiredFixture';
import { instantLocalFixture } from '@test/utils/gestion/anomalies-de-pointage/InstantLocal.fixture';
import { ActiviteAnomalieId } from '../../../domain/dossier/ActiviteAnomalieId';
import { ActiviteAnomalie, DiagnosticConflit, PointageAnomalie } from '../../../domain/dossier/DossierAnomalie';
import { PointageAnomalieId } from '../../../domain/dossier/PointageAnomalieId';
import { SelectionDuDossier } from '../SelectionDuDossier';
import { VueDeFrise } from './DispositionFrise';
import { FriseDossier } from './FriseDossier';

const GESTES = {
  DEMARRAGE: { type: 'DEBUT', intention: 'OUVERTURE' },
  DEMARRAGE_NC: { type: 'NON_CONFORMITE', intention: 'OUVERTURE' },
  PASSAGE_NC: { type: 'NON_CONFORMITE', intention: 'TRANSITION' },
  RETOUR_BON: { type: 'DEBUT', intention: 'TRANSITION' },
  ARRET: { type: 'FIN', intention: 'FIN' },
} as const;

type Geste = keyof typeof GESTES;

const instantAt = (heure: string, jour = 14): string => {
  const [heures = 0, minutes = 0] = heure.split(':').map(Number);
  return instantLocalFixture(new Date(2026, 8, jour, heures, minutes));
};

const pointageFixture = (id: string, geste: Geste, heure: string, surcharge: Partial<PointageAnomalie> = {}): PointageAnomalie => ({
  id: new PointageAnomalieId(id),
  fait: { ...GESTES[geste], activiteVisee: '', operateur: 'op-camille', poste: 'poste-1', instant: instantAt(heure) },
  operateurNom: 'Camille Martin',
  posteLibelle: 'DMU 50',
  auteur: 'camille',
  enregistre: instantAt(heure),
  regularisation: false,
  ...surcharge,
});

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
  temps: '',
  periode: { categorie, debut: instantAt(debut), ...(fin === undefined ? {} : { fin: instantAt(fin) }) },
});

const diagnosticSur = (pointage: string, activite = 'travail-8'): DiagnosticConflit => ({
  pointage: new PointageAnomalieId(pointage),
  raison: 'CIBLE_REMPLACEE',
  cible: { activite: new ActiviteAnomalieId(activite) },
});

describe('Frise of a dossier', () => {
  let fixture: ComponentFixture<FriseDossier>;
  let requestedSelections: SelectionDuDossier[];

  beforeEach(() => {
    requestedSelections = [];
  });

  it('should draw one marker per pointage of the journal', async () => {
    const dossier = {
      journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:00'), pointageFixture('fin-17', 'ARRET', '17:00')],
      activites: [],
    };

    await whenRenderingTheFrise(dossier);

    thenTheMarkersAre(['debut-8', 'fin-17']);
  });

  it('should draw the markers in chronological order whatever the order of the journal', async () => {
    const dossier = {
      journal: [pointageFixture('fin-17', 'ARRET', '17:00'), pointageFixture('debut-8', 'DEMARRAGE', '08:00')],
      activites: [],
    };

    await whenRenderingTheFrise(dossier);

    thenTheMarkersAre(['debut-8', 'fin-17']);
  });

  it('should name each marker by the time of its pointage with its seconds and its gesture', async () => {
    const dossier = {
      journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:00'), pointageFixture('fin-17', 'ARRET', '17:00')],
      activites: [],
    };

    await whenRenderingTheFrise(dossier);

    thenTheMarkerIsNamed('fin-17', '17:00:00 · Arrêt');
    thenTheMarkerIsNamed('debut-8', '08:00:00 · Démarrage');
  });

  it.each<{ cas: string; surcharge: Partial<PointageAnomalie>; diagnostics: readonly string[]; nom: string }>([
    {
      cas: 'a cancelled pointage',
      surcharge: { annulation: { motif: 'Doublon', auteur: 'gestionnaire', instant: instantAt('18:00') } },
      diagnostics: [],
      nom: '17:00:00 · Arrêt · annulé',
    },
    { cas: 'a regularised pointage', surcharge: { regularisation: true }, diagnostics: [], nom: '17:00:00 · Arrêt · régularisé' },
    { cas: 'a pointage at fault', surcharge: {}, diagnostics: ['fin-17'], nom: '17:00:00 · Arrêt · en cause' },
    {
      cas: 'a pointage cancelled, regularised and at fault',
      surcharge: { regularisation: true, annulation: { motif: 'Doublon', auteur: 'gestionnaire', instant: instantAt('18:00') } },
      diagnostics: ['fin-17'],
      nom: '17:00:00 · Arrêt · annulé · régularisé · en cause',
    },
  ])('should say in the name of its marker that it is $cas', async ({ surcharge, diagnostics, nom }) => {
    const dossier = {
      journal: [pointageFixture('fin-17', 'ARRET', '17:00', surcharge)],
      activites: [],
      diagnostics: diagnostics.map(pointage => diagnosticSur(pointage)),
    };

    await whenRenderingTheFrise(dossier);

    thenTheMarkerIsNamed('fin-17', nom);
  });

  it('should flag only the marker of a pointage at fault', async () => {
    const dossier = {
      journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:00'), pointageFixture('fin-17', 'ARRET', '17:00')],
      activites: [],
      diagnostics: [diagnosticSur('fin-17')],
    };

    await whenRenderingTheFrise(dossier);

    thenTheMarkerFlagIs('fin-17', 'data-en-cause', 'true');
    thenTheMarkerFlagIs('debut-8', 'data-en-cause', 'false');
  });

  it('should flag only the marker of a cancelled pointage', async () => {
    const annulation = { motif: 'Doublon', auteur: 'gestionnaire', instant: instantAt('18:00') };
    const dossier = {
      journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:00'), pointageFixture('fin-17', 'ARRET', '17:00', { annulation })],
      activites: [],
    };

    await whenRenderingTheFrise(dossier);

    thenTheMarkerFlagIs('fin-17', 'data-annule', 'true');
    thenTheMarkerFlagIs('debut-8', 'data-annule', 'false');
  });

  it('should mark the marker of a regularised pointage with the badge R and no other', async () => {
    const dossier = {
      journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:00'), pointageFixture('fin-17', 'ARRET', '17:00', { regularisation: true })],
      activites: [],
    };

    await whenRenderingTheFrise(dossier);

    thenTheMarkerBadgeIs('fin-17', 'R');
    thenTheMarkerHasNoBadge('debut-8');
  });

  it.each([
    ['DEMARRAGE', '▶'],
    ['DEMARRAGE_NC', '▶'],
    ['PASSAGE_NC', '◆'],
    ['RETOUR_BON', '◇'],
    ['ARRET', '■'],
  ] as const)('should draw the %s gesture of a pointage with the symbol %s', async (geste, symbole) => {
    const dossier = { journal: [pointageFixture('p-1', geste, '08:00')], activites: [] };

    await whenRenderingTheFrise(dossier);

    thenTheMarkerSymbolIs('p-1', symbole);
  });

  it('should draw a neutral symbol for a gesture it does not know', async () => {
    const inconnu = pointageFixture('p-1', 'ARRET', '08:00');
    const dossier = { journal: [{ ...inconnu, fait: { ...inconnu.fait, type: 'DEBUT' as const } }], activites: [] };

    await whenRenderingTheFrise(dossier);

    thenTheMarkerSymbolIs('p-1', '•');
  });

  it.each([
    ['DEMARRAGE', 'false'],
    ['DEMARRAGE_NC', 'true'],
    ['PASSAGE_NC', 'true'],
    ['RETOUR_BON', 'false'],
    ['ARRET', 'false'],
  ] as const)('should flag the marker of a %s gesture as a non-conformity: %s', async (geste, drapeau) => {
    const dossier = { journal: [pointageFixture('p-1', geste, '08:00')], activites: [] };

    await whenRenderingTheFrise(dossier);

    thenTheMarkerFlagIs('p-1', 'data-non-conformite', drapeau);
  });

  it('should show under each marker the hour and minute of its pointage', async () => {
    const dossier = {
      journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:05'), pointageFixture('fin-17', 'ARRET', '17:00')],
      activites: [],
    };

    await whenRenderingTheFrise(dossier);

    thenTheMarkerTimeIs('debut-8', '08:05');
    thenTheMarkerTimeIs('fin-17', '17:00');
  });

  it('should draw one bar per activity, in the order of their start', async () => {
    const dossier = {
      journal: [],
      activites: [activiteFixture('nc-12', 'A_RESOUDRE', '12:00'), activiteFixture('travail-8', 'A_RESOUDRE', '08:00')],
    };

    await whenRenderingTheFrise(dossier);

    thenTheBarsAre(['travail-8', 'nc-12']);
  });

  it.each([
    ['TRAVAIL', 'TERMINEE', 'Travail · Terminée'],
    ['TRAVAIL', 'A_RESOUDRE', 'Travail · À résoudre'],
    ['TRAVAIL', 'ECHUE', 'Travail · Échue'],
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
    { etat: 'A_RESOUDRE', fin: undefined, attendu: 'OUVERTE' },
    { etat: 'A_RESOUDRE', fin: '10:00', attendu: 'OUVERTE' },
    { etat: 'EN_COURS', fin: '10:00', attendu: 'OUVERTE' },
    { etat: 'ANNULEE', fin: '10:00', attendu: 'RECUE' },
    { etat: 'REMPLACEE', fin: undefined, attendu: 'OUVERTE' },
    { etat: 'ECHUE', fin: undefined, attendu: 'OUVERTE' },
  ] as const)('should end the bar of an activity $etat received with the end $fin as $attendu', async ({ etat, fin, attendu }) => {
    const dossier = { journal: [], activites: [activiteFixture('a-1', etat, '08:00', fin)] };

    await whenRenderingTheFrise(dossier);

    thenTheBarAttributeIs('a-1', 'data-fin', attendu);
  });

  it.each([
    { etat: 'TERMINEE', fin: '17:00', nom: 'Travail · lundi 14 septembre à 08:00 → lundi 14 septembre à 17:00 · Terminée' },
    { etat: 'A_RESOUDRE', fin: undefined, nom: 'Travail · lundi 14 septembre à 08:00 · À résoudre' },
  ] as const)('should name the bar of an activity $etat by its category, its received period and its state', async ({ etat, fin, nom }) => {
    const dossier = { journal: [], activites: [activiteFixture('a-1', etat, '08:00', fin)] };

    await whenRenderingTheFrise(dossier);

    thenTheBarIsNamed('a-1', nom);
  });

  it('should ask for the selection of a pointage when its marker is pressed', async () => {
    const dossier = { journal: [pointageFixture('fin-17', 'ARRET', '17:00')], activites: [] };
    await whenRenderingTheFrise(dossier);

    whenPressing(marker('fin-17'));

    expect(requestedSelections).toEqual([{ kind: 'POINTAGE', id: 'fin-17' }]);
  });

  it('should ask for the selection of an activity when its bar is pressed', async () => {
    const dossier = { journal: [], activites: [activiteFixture('travail-8', 'A_RESOUDRE', '08:00')] };
    await whenRenderingTheFrise(dossier);

    whenPressing(bar('travail-8'));

    expect(requestedSelections).toEqual([{ kind: 'ACTIVITE', id: 'travail-8' }]);
  });

  it('should press only the element the selection received designates', async () => {
    const dossier = {
      journal: [pointageFixture('fin-17', 'ARRET', '17:00'), pointageFixture('debut-8', 'DEMARRAGE', '08:00')],
      activites: [activiteFixture('fin-17', 'A_RESOUDRE', '08:00')],
    };

    await whenRenderingTheFrise(dossier, { kind: 'POINTAGE', id: 'fin-17' });

    thenOnlyThisIsPressed(marker('fin-17'), [marker('debut-8'), bar('fin-17')]);
  });

  it('should press the bar of the activity the selection received designates', async () => {
    const dossier = {
      journal: [pointageFixture('fin-17', 'ARRET', '17:00')],
      activites: [activiteFixture('fin-17', 'A_RESOUDRE', '08:00')],
    };

    await whenRenderingTheFrise(dossier, { kind: 'ACTIVITE', id: 'fin-17' });

    thenOnlyThisIsPressed(bar('fin-17'), [marker('fin-17')]);
  });

  it('should follow the time in the tab order, bars by their start and markers by their instant', async () => {
    const dossier = {
      journal: [
        pointageFixture('fin-17', 'ARRET', '17:00'),
        pointageFixture('nc-10', 'PASSAGE_NC', '10:00'),
        pointageFixture('debut-8', 'DEMARRAGE', '08:00'),
      ],
      activites: [
        activiteFixture('nc-12', 'A_RESOUDRE', '12:00', undefined, 'NON_CONFORMITE'),
        activiteFixture('travail-8', 'A_RESOUDRE', '08:00'),
      ],
    };

    await whenRenderingTheFrise(dossier);

    thenTheTabOrderIs([
      'Travail · lundi 14 septembre à 08:00 · À résoudre',
      '08:00:00 · Démarrage',
      '10:00:00 · Passage en NC',
      'Non-conformité · lundi 14 septembre à 12:00 · À résoudre',
      '17:00:00 · Arrêt',
    ]);
  });

  it('should give an activity without period its row and its label but no bar', async () => {
    const sansPeriode: ActiviteAnomalie = {
      id: new ActiviteAnomalieId('a-1'),
      libelle: 'Travail ouvert à 8 h',
      etat: 'A_RESOUDRE',
      temps: '',
    };
    const dossier = { journal: [pointageFixture('fin-17', 'ARRET', '17:00')], activites: [sansPeriode] };

    await whenRenderingTheFrise(dossier);

    thenTheBarReads('a-1', 'Travail ouvert à 8 h');
    thenTheBarAttributeIs('a-1', 'data-fin', null);
  });

  it('should leave the activity without period last in the tab order and let it be selected', async () => {
    const sansPeriode: ActiviteAnomalie = {
      id: new ActiviteAnomalieId('a-1'),
      libelle: 'Travail ouvert à 8 h',
      etat: 'A_RESOUDRE',
      temps: '',
    };
    const dossier = { journal: [pointageFixture('fin-17', 'ARRET', '17:00')], activites: [sansPeriode] };
    await whenRenderingTheFrise(dossier);

    whenPressing(bar('a-1'));

    thenTheTabOrderIs(['17:00:00 · Arrêt', 'Travail ouvert à 8 h · À résoudre']);
    expect(requestedSelections).toEqual([{ kind: 'ACTIVITE', id: 'a-1' }]);
  });

  it('should graduate the scale by the hour, from an hour before the first pointage to an hour after the last, rounded to the hour', async () => {
    const dossier = { journal: [pointageFixture('p-1', 'DEMARRAGE', '08:30'), pointageFixture('p-2', 'ARRET', '10:15')], activites: [] };

    await whenRenderingTheFrise(dossier);

    thenTheGraduationsAre(['07:00', '08:00', '09:00', '10:00', '11:00', '12:00']);
  });

  it('should reach the start and the end of the activities received when graduating the scale', async () => {
    const dossier = {
      journal: [pointageFixture('p-1', 'ARRET', '10:00')],
      activites: [activiteFixture('a-1', 'TERMINEE', '06:00', '08:00')],
    };

    await whenRenderingTheFrise(dossier);

    thenTheGraduationsAre(['05:00', '06:00', '07:00', '08:00', '09:00', '10:00', '11:00']);
  });

  it('should place each marker at the share of the scale its instant stands at', async () => {
    const dossier = { journal: [pointageFixture('p-1', 'DEMARRAGE', '08:00'), pointageFixture('p-2', 'ARRET', '10:00')], activites: [] };

    await whenRenderingTheFrise(dossier);

    thenTheMarkerStandsAt('p-1', 25);
    thenTheMarkerStandsAt('p-2', 75);
  });

  it('should lay a bar from its start to its received end on the scale', async () => {
    const dossier = {
      journal: [pointageFixture('p-1', 'ARRET', '12:00')],
      activites: [activiteFixture('a-1', 'TERMINEE', '08:00', '10:00')],
    };

    await whenRenderingTheFrise(dossier);

    thenTheBarSpans('a-1', { gauche: 16.667, largeur: 33.333 });
  });

  it('should open a bar that has no end to the edge of the scale', async () => {
    const dossier = { journal: [pointageFixture('p-1', 'ARRET', '10:00')], activites: [activiteFixture('a-1', 'A_RESOUDRE', '08:00')] };

    await whenRenderingTheFrise(dossier);

    thenTheBarSpans('a-1', { gauche: 25, largeur: 75 });
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
      activites: [],
    };

    await whenRenderingTheFrise(dossier);

    thenTheGraduationsAre(['21:00', '22:00', '23:00', '00:00', '01:00', '02:00', '03:00']);
    thenTheDaysShownAre(['mar. 15 sept.']);
  });

  it('should show no day on a sequence that crosses no midnight', async () => {
    const dossier = { journal: [pointageFixture('p-1', 'DEMARRAGE', '08:00'), pointageFixture('p-2', 'ARRET', '17:00')], activites: [] };

    await whenRenderingTheFrise(dossier);

    thenTheDaysShownAre([]);
  });

  it('should offset by one lane the markers closer than the width of a touch target', async () => {
    const dossier = {
      journal: [
        pointageFixture('p-1', 'DEMARRAGE', '08:00'),
        pointageFixture('p-2', 'PASSAGE_NC', '08:20'),
        pointageFixture('p-3', 'ARRET', '12:00'),
      ],
      activites: [],
    };

    await whenRenderingTheFrise(dossier);

    thenTheMarkerLanesAre({ 'p-1': '0', 'p-2': '1', 'p-3': '0' });
  });

  it('should keep a marker on the first lane once the previous one is far enough', async () => {
    const dossier = { journal: [pointageFixture('p-1', 'DEMARRAGE', '08:00'), pointageFixture('p-2', 'ARRET', '09:00')], activites: [] };

    await whenRenderingTheFrise(dossier);

    thenTheMarkerLanesAre({ 'p-1': '0', 'p-2': '0' });
  });

  it('should open a further lane for a marker that every lane in use keeps too close', async () => {
    const dossier = {
      journal: [
        pointageFixture('p-1', 'DEMARRAGE', '08:00'),
        pointageFixture('p-2', 'PASSAGE_NC', '08:00'),
        pointageFixture('p-3', 'ARRET', '08:00'),
      ],
      activites: [],
    };

    await whenRenderingTheFrise(dossier);

    thenTheMarkerLanesAre({ 'p-1': '0', 'p-2': '1', 'p-3': '2' });
  });

  it('should give each activity its own row, below the pointages, in the order of their start', async () => {
    const dossier = {
      journal: [pointageFixture('p-1', 'DEMARRAGE', '08:00'), pointageFixture('p-2', 'PASSAGE_NC', '08:20')],
      activites: [activiteFixture('a-2', 'A_RESOUDRE', '09:00'), activiteFixture('a-1', 'A_RESOUDRE', '08:00')],
    };

    await whenRenderingTheFrise(dossier);

    thenTheBarsAreBelowTheMarkersAndStackedInOrder(['a-1', 'a-2'], ['p-1', 'p-2']);
  });

  it('should lower a marker offset by a lane by the height of a touch target', async () => {
    const dossier = {
      journal: [pointageFixture('p-1', 'DEMARRAGE', '08:00'), pointageFixture('p-2', 'PASSAGE_NC', '08:20')],
      activites: [],
    };

    await whenRenderingTheFrise(dossier);

    expect(topOf(marker('p-2')) - topOf(marker('p-1'))).toBe(44);
  });

  it('should draw the frise of a dossier that holds a pointage', async () => {
    const dossier = { journal: [pointageFixture('p-1', 'ARRET', '17:00')], activites: [] };

    await whenRenderingTheFrise(dossier);

    thenTheFriseIsDrawn();
  });

  it('should draw nothing for a dossier that holds neither pointage nor activity', async () => {
    const dossier = { journal: [], activites: [] };

    await whenRenderingTheFrise(dossier);

    thenNoFriseIsDrawn();
  });

  it('should still list an activity that holds no period when the dossier holds no instant at all', async () => {
    const sansPeriode: ActiviteAnomalie = {
      id: new ActiviteAnomalieId('a-1'),
      libelle: 'Travail ouvert à 8 h',
      etat: 'A_RESOUDRE',
      temps: '',
    };

    await whenRenderingTheFrise({ journal: [], activites: [sansPeriode] });

    thenTheBarReads('a-1', 'Travail ouvert à 8 h');
  });

  it('should draw no marker for a pointage whose instant it cannot read, nor let it spoil the scale', async () => {
    const illisible = pointageFixture('p-1', 'ARRET', '17:00');
    const dossier = {
      journal: [{ ...illisible, fait: { ...illisible.fait, instant: 'illisible' } }, pointageFixture('p-2', 'DEMARRAGE', '08:00')],
      activites: [],
    };

    await whenRenderingTheFrise(dossier);

    thenTheMarkersAre(['p-2']);
    thenTheGraduationsAre(['07:00', '08:00', '09:00']);
  });

  it('should draw an arrow from the pointage at fault to the activity its diagnostic aims at', async () => {
    const dossier = {
      journal: [pointageFixture('fin-17', 'ARRET', '17:00')],
      activites: [activiteFixture('travail-8', 'A_RESOUDRE', '08:00')],
      diagnostics: [diagnosticSur('fin-17', 'travail-8')],
    };

    await whenRenderingTheFrise(dossier);

    thenTheArrowsAre([{ pointage: 'fin-17', activite: 'travail-8' }]);
  });

  it('should make the arrow leave the marker at fault and reach the start of the activity aimed at, going down', async () => {
    const dossier = {
      journal: [pointageFixture('fin-17', 'ARRET', '17:00')],
      activites: [activiteFixture('travail-8', 'A_RESOUDRE', '08:00')],
      diagnostics: [diagnosticSur('fin-17', 'travail-8')],
    };

    await whenRenderingTheFrise(dossier);

    thenTheArrowLeaves(marker('fin-17'), bar('travail-8'));
  });

  it('should keep the arrow out of the way of assistive technology', async () => {
    const dossier = {
      journal: [pointageFixture('fin-17', 'ARRET', '17:00')],
      activites: [activiteFixture('travail-8', 'A_RESOUDRE', '08:00')],
      diagnostics: [diagnosticSur('fin-17', 'travail-8')],
    };

    await whenRenderingTheFrise(dossier);

    thenTheArrowsAreDecorative();
  });

  it.each([
    { cas: 'no diagnostic', diagnostics: [] },
    { cas: 'a diagnostic aiming at an activity the dossier does not hold', diagnostics: [diagnosticSur('fin-17', 'absente')] },
    { cas: 'a diagnostic on a pointage the journal does not hold', diagnostics: [diagnosticSur('absent', 'travail-8')] },
    { cas: 'a diagnostic aiming at an activity without period', diagnostics: [diagnosticSur('fin-17', 'sans-periode')] },
  ])('should draw no arrow for $cas', async ({ diagnostics }) => {
    const sansPeriode: ActiviteAnomalie = { id: new ActiviteAnomalieId('sans-periode'), libelle: 'Travail', etat: 'A_RESOUDRE', temps: '' };
    const dossier = {
      journal: [pointageFixture('fin-17', 'ARRET', '17:00')],
      activites: [activiteFixture('travail-8', 'A_RESOUDRE', '08:00'), sansPeriode],
      diagnostics,
    };

    await whenRenderingTheFrise(dossier);

    thenTheArrowsAre([]);
  });

  it('should keep a minimum width of 64 pixels per hour of the scale, so that a narrow screen scrolls the frise', async () => {
    const dossier = { journal: [pointageFixture('p-1', 'DEMARRAGE', '08:00'), pointageFixture('p-2', 'ARRET', '10:00')], activites: [] };

    await whenRenderingTheFrise(dossier);

    expect(thePlan().style.minWidth).toBe('256px');
  });

  it('should be tall enough for its lowest element', async () => {
    const dossier = {
      journal: [pointageFixture('p-1', 'DEMARRAGE', '08:00'), pointageFixture('p-2', 'ARRET', '08:10')],
      activites: [activiteFixture('a-1', 'A_RESOUDRE', '08:00'), activiteFixture('a-2', 'A_RESOUDRE', '09:00')],
    };

    await whenRenderingTheFrise(dossier);

    expect(Number.parseFloat(thePlan().style.height)).toBeGreaterThanOrEqual(topOf(bar('a-2')) + 44);
  });

  it('should stretch the graduations from the left edge to the right edge of the frise', async () => {
    const dossier = { journal: [pointageFixture('p-1', 'DEMARRAGE', '08:00'), pointageFixture('p-2', 'ARRET', '10:00')], activites: [] };

    await whenRenderingTheFrise(dossier);

    thenTheGraduationsStandAt([0, 25, 50, 75, 100]);
  });

  const whenRenderingTheFrise = async (dossier: VueDeFrise, selection?: SelectionDuDossier): Promise<void> => {
    fixture = TestBed.createComponent(FriseDossier);
    fixture.componentRef.setInput('dossier', dossier);
    fixture.componentRef.setInput('now', new Date(2026, 9, 5, 10, 0));
    fixture.componentRef.setInput('selection', selection);
    fixture.componentInstance.selectionDemandee.subscribe(demandee => requestedSelections.push(demandee));
    await fixture.whenStable();
  };

  const whenPressing = (element: HTMLElement): void => {
    element.click();
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

  const thenTheBarIsNamed = (activite: string, expected: string): void => {
    expect(bar(activite).getAttribute('aria-label')).toBe(expected);
  };

  const thenOnlyThisIsPressed = (pressed: HTMLElement, others: readonly HTMLElement[]): void => {
    expect(pressed.getAttribute('aria-pressed')).toBe('true');
    expect(others.map(other => other.getAttribute('aria-pressed'))).toEqual(others.map(() => 'false'));
  };

  const thenTheTabOrderIs = (expected: readonly string[]): void => {
    const buttons = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')];
    expect(buttons.map(button => button.getAttribute('aria-label'))).toEqual(expected);
  };

  const thenTheGraduationsAre = (expected: readonly string[]): void => {
    const graduations = [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(dataSelector('anomalie-frise-graduation-heure')),
    ];
    expect(graduations.map(graduation => graduation.textContent.trim())).toEqual(expected);
  };

  const thenTheMarkerStandsAt = (pointage: string, expected: number): void => {
    expect(Number.parseFloat(marker(pointage).style.left)).toBeCloseTo(expected);
  };

  const thenTheBarSpans = (activite: string, expected: { gauche: number; largeur: number }): void => {
    const style = bar(activite).style;
    expect({ gauche: Number.parseFloat(style.left), largeur: Number.parseFloat(style.width) }).toEqual({
      gauche: expect.closeTo(expected.gauche) as number,
      largeur: expect.closeTo(expected.largeur) as number,
    });
  };

  const thenTheNumberOfGraduationsIs = (expected: number): void => {
    expect((fixture.nativeElement as HTMLElement).querySelectorAll(dataSelector('anomalie-frise-graduation'))).toHaveLength(expected);
  };

  const thenTheMarkerLanesAre = (expected: Readonly<Record<string, string>>): void => {
    const lanes: Record<string, string | undefined> = {};
    for (const candidate of markers()) lanes[candidate.dataset['pointage'] ?? ''] = candidate.dataset['voie'];
    expect(lanes).toEqual(expected);
  };

  const topOf = (element: HTMLElement): number => Number.parseFloat(element.style.top);

  const thenTheBarsAreBelowTheMarkersAndStackedInOrder = (activites: readonly string[], pointages: readonly string[]): void => {
    const tops = activites.map(activite => topOf(bar(activite)));
    const lowestMarkerBottom = Math.max(...pointages.map(pointage => topOf(marker(pointage)) + 44));
    expect(tops).toEqual([...tops].sort((first, second) => first - second));
    expect(new Set(tops).size).toBe(tops.length);
    expect(Math.min(...tops)).toBeGreaterThanOrEqual(lowestMarkerBottom);
  };

  const thenTheFriseIsDrawn = (): void => {
    expect((fixture.nativeElement as HTMLElement).querySelector(dataSelector('anomalie-frise'))).not.toBeNull();
  };

  const thenNoFriseIsDrawn = (): void => {
    expect((fixture.nativeElement as HTMLElement).querySelector(dataSelector('anomalie-frise'))).toBeNull();
  };

  const arrows = (): SVGElement[] => [
    ...(fixture.nativeElement as HTMLElement).querySelectorAll<SVGElement>(dataSelector('anomalie-frise-fleche')),
  ];

  const thenTheArrowsAre = (expected: readonly { pointage: string; activite: string }[]): void => {
    expect(arrows().map(arrow => ({ pointage: arrow.dataset['pointage'], activite: arrow.dataset['activite'] }))).toEqual(expected);
  };

  const thenTheArrowLeaves = (depart: HTMLElement, arrivee: HTMLElement): void => {
    const [arrow] = arrows();
    const fleche = requiredFixture(arrow, 'arrow');
    expect(Number.parseFloat(fleche.getAttribute('x1') ?? '')).toBeCloseTo(Number.parseFloat(depart.style.left));
    expect(Number.parseFloat(fleche.getAttribute('x2') ?? '')).toBeCloseTo(Number.parseFloat(arrivee.style.left));
    expect(Number.parseFloat(fleche.getAttribute('y1') ?? '')).toBe(topOf(depart) + 44);
    expect(Number.parseFloat(fleche.getAttribute('y2') ?? '')).toBe(topOf(arrivee));
  };

  const thenTheArrowsAreDecorative = (): void => {
    const [arrow] = arrows();
    expect(requiredFixture(arrow, 'arrow').closest('svg')?.getAttribute('aria-hidden')).toBe('true');
  };

  const thePlan = (): HTMLElement =>
    requiredFixture((fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(dataSelector('anomalie-frise-plan')), 'frise plan');

  const thenTheGraduationsStandAt = (expected: readonly number[]): void => {
    const graduations = [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(dataSelector('anomalie-frise-graduation')),
    ];
    expect(graduations.map(graduation => Number.parseFloat(graduation.style.left))).toEqual(
      expected.map(position => expect.closeTo(position) as number),
    );
  };

  const thenTheDaysShownAre = (expected: readonly string[]): void => {
    const jours = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(dataSelector('anomalie-frise-jour'))];
    expect(jours.map(jour => jour.textContent.trim())).toEqual(expected);
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
        activites: [],
      };

      await whenRenderingTheFrise(dossier);

      thenTheNumberOfGraduationsIs(6);
    });
  });
});
