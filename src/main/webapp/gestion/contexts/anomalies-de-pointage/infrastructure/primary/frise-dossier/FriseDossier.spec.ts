import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResizeObserverFixture } from '@test/unit/fixtures/gestion/anomalies-de-pointage/ResizeObserverFixture';
import { dataSelector } from '@test/utils/DataSelector';
import { requiredFixture } from '@test/utils/RequiredFixture';
import { instantLocalFixture } from '@test/utils/gestion/anomalies-de-pointage/InstantLocal.fixture';
import { SaisieActe } from '../../../domain/acte/SaisieActe';
import { ActiviteAnomalieId } from '../../../domain/dossier/ActiviteAnomalieId';
import { ActiviteAnomalie, ChoixGuide, DiagnosticConflit, PointageAnomalie } from '../../../domain/dossier/DossierAnomalie';
import { PerimetreDuDossier } from '../../../domain/dossier/PerimetreDuDossier';
import { PointageAnomalieId } from '../../../domain/dossier/PointageAnomalieId';
import { SelectionDuDossier } from '../SelectionDuDossier';
import { VueDeFrise } from './DispositionFrise';
import { FriseDossier } from './FriseDossier';
import { DemandeDeDeplacement, DeplacementDemande, PlacementDeLInstant, PlacementDemande, PoigneeDeFrise } from './PoigneeDeFrise';

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
  temps: '',
  ouvrant: new PointageAnomalieId(`debut-${id}`),
  periode: { categorie, debut: instantAt(debut), ...(fin === undefined ? {} : { fin: instantAt(fin) }) },
});

const diagnosticSur = (pointage: string, activite = 'travail-8'): DiagnosticConflit => ({
  pointage: new PointageAnomalieId(pointage),
  raison: 'CIBLE_REMPLACEE',
  cible: { activite: new ActiviteAnomalieId(activite) },
});

const poigneeFixture = (heure: string, surcharge: Partial<PoigneeDeFrise> = {}): PoigneeDeFrise => ({
  instant: instantAt(heure),
  activiteVisee: 'travail-8',
  bornes: { min: instantAt('08:00'), max: instantLocalFixture(new Date(2026, 9, 5, 10, 0)) },
  desactivee: false,
  ...surcharge,
});

const choixFixture = (code: NonNullable<ChoixGuide['code']>, saisie: SaisieActe): ChoixGuide => ({
  id: `${code}:choix`,
  code,
  libelle: '',
  explication: '',
  saisie,
});

const correctionTardiveFixture = (code: 'CORRIGER_FIN_TARDIVE' | 'CORRIGER_TRANSITION_TARDIVE', pointage: string): ChoixGuide =>
  choixFixture(
    code,
    SaisieActe.correct(pointage, {
      type: 'FIN',
      intention: 'FIN',
      activiteVisee: 'travail-8',
      operateur: 'op-camille',
      poste: 'poste-1',
      instant: instantAt('23:00'),
    }),
  );

const placementFixture = (surcharge: Partial<PlacementDeLInstant> = {}): PlacementDeLInstant => ({
  activiteVisee: 'travail-8',
  bornes: { min: instantAt('08:00'), max: instantAt('13:00') },
  desactivee: false,
  ...surcharge,
});

const PLAN_WIDTH = 1000;

type VueDeTest = Omit<VueDeFrise, 'perimetre'> & { readonly perimetre?: PerimetreDuDossier };

const perimetreDe = (...pointages: readonly string[]): PerimetreDuDossier =>
  new PerimetreDuDossier(pointages.map(pointage => new PointageAnomalieId(pointage)));

const vueDe = (vue: VueDeTest): VueDeFrise => ({
  ...vue,
  perimetre: vue.perimetre ?? new PerimetreDuDossier(vue.journal.map(pointage => pointage.id)),
});

describe('Frise of a dossier', () => {
  let fixture: ComponentFixture<FriseDossier>;
  let requestedSelections: SelectionDuDossier[];
  let requestedMoves: DeplacementDemande[];
  let requestedPlacements: PlacementDemande[];
  let resizeObserver: ResizeObserverFixture;

  beforeEach(() => {
    resizeObserver = new ResizeObserverFixture();
    requestedSelections = [];
    requestedMoves = [];
    requestedPlacements = [];
    HTMLElement.prototype.setPointerCapture = () => undefined;
  });

  afterEach(() => {
    resizeObserver.restore();
  });

  it('should draw one marker per pointage of the journal', async () => {
    const dossier = {
      journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:00'), pointageFixture('fin-17', 'ARRET', '17:00')],
      activites: [],
    };

    await whenRenderingTheFrise(dossier);

    thenTheMarkersAre(['debut-8', 'fin-17']);
  });

  it('should draw only the pointages of the anomaly when the journal holds more', async () => {
    const dossier = {
      journal: [
        pointageFixture('debut-8', 'DEMARRAGE', '08:00'),
        pointageFixture('autre-10', 'PASSAGE_NC', '10:00'),
        pointageFixture('fin-17', 'ARRET', '17:00'),
      ],
      perimetre: perimetreDe('debut-8', 'fin-17'),
      activites: [],
    };

    await whenRenderingTheFrise(dossier);

    thenTheMarkersAre(['debut-8', 'fin-17']);
  });

  it('should keep the scale on the anomaly when the journal holds pointages of other days', async () => {
    const dossier = {
      journal: [
        {
          ...pointageFixture('veille-9', 'DEMARRAGE', '09:00'),
          fait: { ...pointageFixture('x', 'DEMARRAGE', '09:00').fait, instant: instantAt('09:00', 10) },
        },
        pointageFixture('debut-8', 'DEMARRAGE', '08:00'),
        pointageFixture('fin-11', 'ARRET', '11:00'),
      ],
      perimetre: perimetreDe('debut-8', 'fin-11'),
      activites: [],
    };

    await whenRenderingTheFrise(dossier);

    thenTheGraduationsAre(['07:00', '08:00', '09:00', '10:00', '11:00', '12:00']);
  });

  it('should draw the cancelled opening and both stops that target it although the perimeter holds only the anchor', async () => {
    const dossier = {
      journal: [
        pointageFixture('ouvrant-annule', 'DEMARRAGE', '08:00', {
          annulation: { motif: 'Erreur', auteur: 'gestionnaire', instant: instantAt('09:00') },
        }),
        pointageFixture('arret-un', 'ARRET', '10:00'),
        pointageFixture('arret-deux', 'ARRET', '11:00'),
        pointageFixture('autre-12', 'PASSAGE_NC', '12:00'),
      ],
      perimetre: perimetreDe('arret-un'),
      diagnostics: [
        {
          ...diagnosticSur('arret-un'),
          raison: 'OUVRANT_ANNULE' as const,
          cible: { activite: new ActiviteAnomalieId('travail-8'), ouvrant: new PointageAnomalieId('ouvrant-annule') },
        },
        {
          ...diagnosticSur('arret-deux'),
          raison: 'OUVRANT_ANNULE' as const,
          cible: { activite: new ActiviteAnomalieId('travail-8'), ouvrant: new PointageAnomalieId('ouvrant-annule') },
        },
      ],
      activites: [],
    };

    await whenRenderingTheFrise(dossier);

    thenTheMarkersAre(['ouvrant-annule', 'arret-un', 'arret-deux']);
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

  it('should name the marker of the late pointage a choice corrects as pointed after the deadline', async () => {
    const dossier = {
      journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:00'), pointageFixture('fin-23', 'ARRET', '23:00')],
      activites: [],
      choix: [correctionTardiveFixture('CORRIGER_FIN_TARDIVE', 'fin-23')],
    };

    await whenRenderingTheFrise(dossier);

    thenTheMarkerIsNamed('fin-23', '23:00:00 · Arrêt · pointé après l’échéance');
    thenTheMarkerIsNamed('debut-8', '08:00:00 · Démarrage');
  });

  it.each(['CORRIGER_FIN_TARDIVE', 'CORRIGER_TRANSITION_TARDIVE'] as const)(
    'should mark with a visible badge only the marker of the pointage the %s choice corrects',
    async code => {
      const dossier = {
        journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:00'), pointageFixture('fin-23', 'ARRET', '23:00')],
        activites: [],
        choix: [correctionTardiveFixture(code, 'fin-23')],
      };

      await whenRenderingTheFrise(dossier);

      thenTheMarkerFlagIs('fin-23', 'data-tardif', 'true');
      thenTheMarkerFlagIs('debut-8', 'data-tardif', 'false');
      thenTheLateBadgeIsDrawnOn('fin-23');
      thenNoLateBadgeIsDrawnOn('debut-8');
    },
  );

  it.each([
    { cas: 'a cancellation', choix: choixFixture('ANNULER_TRANSITION', SaisieActe.cancel('fin-23')) },
    {
      cas: 'an end regularisation',
      choix: choixFixture('REGULARISER_FIN', SaisieActe.regularise()),
    },
  ])('should mark no pointage as late when the only choice is $cas', async ({ choix }) => {
    const dossier = {
      journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:00'), pointageFixture('fin-23', 'ARRET', '23:00')],
      activites: [],
      choix: [choix],
    };

    await whenRenderingTheFrise(dossier);

    thenTheMarkerFlagIs('fin-23', 'data-tardif', 'false');
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
    ['DEMARRAGE_NC', '▷'],
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

  it('should place the handle in the tab order at the time it stands at', async () => {
    const dossier = {
      journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:00'), pointageFixture('fin-12', 'ARRET', '12:00')],
      activites: [activiteFixture('travail-8', 'A_RESOUDRE', '08:00')],
    };

    await whenRenderingTheFrise(dossier, undefined, poigneeFixture('10:00'));

    thenTheFocusOrderIs([
      'Travail · lundi 14 septembre à 08:00 · À résoudre',
      '08:00:00 · Démarrage',
      'Heure proposée du fait',
      '12:00:00 · Arrêt',
    ]);
  });

  it('should give an activity without period its row and its label but no bar', async () => {
    const sansPeriode: ActiviteAnomalie = {
      id: new ActiviteAnomalieId('a-1'),
      libelle: 'Travail ouvert à 8 h',
      etat: 'A_RESOUDRE',
      temps: '',
      ouvrant: new PointageAnomalieId('debut-a-1'),
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
      ouvrant: new PointageAnomalieId('debut-a-1'),
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
    const dossier = { journal: [pointageFixture('p-1', 'DEMARRAGE', '08:00'), pointageFixture('p-2', 'ARRET', '17:00')], activites: [] };
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
      activites: [],
    };
    await whenRenderingTheFrise(dossier);

    await whenTheFriseIsMeasured(largeur);

    thenTheGraduationsAre(jours.map(() => '00:00'));
    thenTheDaysShownAre(jours);
  });

  it('should graduate the midnight that opens a week counted from the start of the scale', async () => {
    const dossier = {
      journal: [pointageLe('p-1', 'DEMARRAGE', 14, '08:00'), pointageLe('p-2', 'ARRET', 23, '17:00')],
      activites: [],
    };
    await whenRenderingTheFrise(dossier);

    await whenTheFriseIsMeasured(100);

    thenTheDaysShownAre(['lun. 21 sept.']);
  });

  it('should graduate the hours the way it did when the frise is wide, as the reference width leaves 64 pixels per hour', async () => {
    const dossier = { journal: [pointageFixture('p-1', 'DEMARRAGE', '08:00'), pointageFixture('p-2', 'ARRET', '17:00')], activites: [] };

    await whenRenderingTheFrise(dossier);

    thenTheNumberOfGraduationsIs(12);
  });

  it('should take a new measure of its host into account', async () => {
    const dossier = { journal: [pointageFixture('p-1', 'DEMARRAGE', '08:00'), pointageFixture('p-2', 'ARRET', '17:00')], activites: [] };
    await whenRenderingTheFrise(dossier);
    await whenTheFriseIsMeasured(150);

    await whenTheFriseIsMeasured(704);

    thenTheNumberOfGraduationsIs(12);
  });

  it('should ignore a measure of zero width', async () => {
    const dossier = { journal: [pointageFixture('p-1', 'DEMARRAGE', '08:00'), pointageFixture('p-2', 'ARRET', '17:00')], activites: [] };
    await whenRenderingTheFrise(dossier);
    await whenTheFriseIsMeasured(150);

    await whenTheFriseIsMeasured(0);

    thenTheGraduationsAre(['12:00', '18:00']);
  });

  it('should stop observing the size of its host when destroyed', async () => {
    const dossier = { journal: [pointageFixture('p-1', 'DEMARRAGE', '08:00')], activites: [] };
    await whenRenderingTheFrise(dossier);

    whenDestroyingTheFrise();

    expect(resizeObserver.observantUnElement).toBe(false);
  });

  it('should keep the exact time of a marker on a narrow frise, whatever the room its position leaves', async () => {
    const dossier = { journal: [pointageFixture('p-1', 'DEMARRAGE', '08:00'), pointageFixture('p-2', 'ARRET', '17:00')], activites: [] };
    await whenRenderingTheFrise(dossier);

    await whenTheFriseIsMeasured(100);

    thenTheMarkerTimeIs('p-1', '08:00');
    thenTheMarkerTimeIs('p-2', '17:00');
  });

  it('should keep the exact time of the handle on a narrow frise, whatever the room its position leaves', async () => {
    const dossier = { journal: [pointageFixture('p-1', 'DEMARRAGE', '08:00')], activites: [] };
    await whenRenderingTheFrise(dossier, undefined, poigneeFixture('10:45'));

    await whenTheFriseIsMeasured(100);

    thenTheHandleIsReadAs('10:45');
  });

  it('should not shift the handle under the pointer when it is grabbed while held away from the edge', async () => {
    const dossier = { journal: [pointageFixture('p-1', 'DEMARRAGE', '08:00')], activites: [] };
    await whenRenderingTheFrise(dossier, undefined, poigneeFixture('10:45'));
    await whenTheFriseIsMeasured(100);

    whenDraggingTheHandle({ from: 780, to: 780 });

    thenTheMovesAsked([{ kind: 'VERS', instant: new Date(2026, 8, 14, 10, 45).getTime() }]);
  });

  it('should reach the start and the end of the activities received when graduating the scale', async () => {
    const dossier = {
      journal: [pointageFixture('p-1', 'ARRET', '10:00')],
      activites: [activiteFixture('a-1', 'TERMINEE', '06:00', '08:00')],
    };

    await whenRenderingTheFrise(dossier);

    thenTheGraduationsAre(['05:00', '06:00', '07:00', '08:00', '09:00', '10:00', '11:00']);
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
    await whenTheFriseIsMeasured(390);

    thenTheMarkersStandOnRows([['p-1', 'p-3'], ['p-2']]);
  });

  it('should keep a marker on the first lane once the previous one is far enough', async () => {
    const dossier = { journal: [pointageFixture('p-1', 'DEMARRAGE', '08:00'), pointageFixture('p-2', 'ARRET', '09:00')], activites: [] };

    await whenRenderingTheFrise(dossier);

    thenTheMarkersStandOnRows([['p-1', 'p-2']]);
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

    thenTheMarkersStandOnRows([['p-1'], ['p-2'], ['p-3']]);
  });

  it('should offset by a lane a marker that the left edge pushes closer than a touch target to the previous one', async () => {
    const dossier = {
      journal: [
        pointageLe('p-1', 'DEMARRAGE', 14, '08:00'),
        pointageLe('p-2', 'PASSAGE_NC', 14, '11:30'),
        pointageLe('p-3', 'ARRET', 15, '10:00'),
      ],
      activites: [],
    };

    await whenRenderingTheFrise(dossier);
    await whenTheFriseIsMeasured(356);

    thenTheMarkersStandOnRows([['p-1', 'p-3'], ['p-2']]);
  });

  it('should offset by a lane a marker that the right edge pushes closer than a touch target to the previous one', async () => {
    const dossier = {
      journal: [
        pointageLe('p-1', 'DEMARRAGE', 14, '08:00'),
        pointageLe('p-2', 'PASSAGE_NC', 15, '06:30'),
        pointageLe('p-3', 'ARRET', 15, '10:00'),
      ],
      activites: [],
    };

    await whenRenderingTheFrise(dossier);
    await whenTheFriseIsMeasured(356);

    thenTheMarkersStandOnRows([['p-1', 'p-2'], ['p-3']]);
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
    await whenTheFriseIsMeasured(150);

    expect(topOf(marker('p-2')) - topOf(marker('p-1'))).toBe(44);
  });

  it('should title the row of the pointages and stand the title above their markers', async () => {
    const dossier = {
      journal: [pointageFixture('p-1', 'DEMARRAGE', '08:00'), pointageFixture('p-2', 'PASSAGE_NC', '08:20')],
      activites: [],
    };

    await whenRenderingTheFrise(dossier);

    thenThePointagesRowIsTitled('Pointages');
    thenTheTitleOfThePointagesStandsAbove(['p-1', 'p-2']);
  });

  it('should draw no title for the pointages when the journal holds none', async () => {
    const dossier = { journal: [], activites: [activiteFixture('a-1', 'A_RESOUDRE', '08:00')] };

    await whenRenderingTheFrise(dossier);

    thenNoTitleIsDrawnForThePointages();
  });

  it('should start the placement row under the title of the pointages so that it covers only their markers', async () => {
    const dossier = {
      journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:00'), pointageFixture('fin-12', 'ARRET', '12:00')],
      activites: [],
    };

    await whenRenderingTheFrise(dossier, undefined, undefined, placementFixture());

    thenThePlacementRowStartsUnderTheTitleOfThePointages();
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
      ouvrant: new PointageAnomalieId('debut-a-1'),
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
    const sansPeriode: ActiviteAnomalie = {
      id: new ActiviteAnomalieId('sans-periode'),
      libelle: 'Travail',
      etat: 'A_RESOUDRE',
      temps: '',
      ouvrant: new PointageAnomalieId('debut-sans-periode'),
    };
    const dossier = {
      journal: [pointageFixture('fin-17', 'ARRET', '17:00')],
      activites: [activiteFixture('travail-8', 'A_RESOUDRE', '08:00'), sansPeriode],
      diagnostics,
    };

    await whenRenderingTheFrise(dossier);

    thenTheArrowsAre([]);
  });

  it('should keep two markers 20 minutes apart on one lane while the frise holds them 44 pixels apart', async () => {
    const dossier = {
      journal: [
        pointageFixture('p-1', 'DEMARRAGE', '08:00'),
        pointageFixture('p-2', 'PASSAGE_NC', '08:20'),
        pointageFixture('p-3', 'ARRET', '12:00'),
      ],
      activites: [],
    };

    await whenRenderingTheFrise(dossier);

    thenTheMarkersStandOnRows([['p-1', 'p-2', 'p-3']]);
  });

  it('should be tall enough for its lowest element', async () => {
    const dossier = {
      journal: [pointageFixture('p-1', 'DEMARRAGE', '08:00'), pointageFixture('p-2', 'ARRET', '08:10')],
      activites: [activiteFixture('a-1', 'A_RESOUDRE', '08:00'), activiteFixture('a-2', 'A_RESOUDRE', '09:00')],
    };

    await whenRenderingTheFrise(dossier);

    expect(Number.parseFloat(thePlan().style.height)).toBeGreaterThanOrEqual(topOf(bar('a-2')) + 44);
  });

  it('should ask to place the instant where the pointages row is clicked', async () => {
    const dossier = {
      journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:00'), pointageFixture('fin-12', 'ARRET', '12:00')],
      activites: [],
    };
    await whenRenderingTheFrise(dossier, undefined, undefined, placementFixture());

    whenClickingThePointagesRowAt(500);

    thenThePlacementsAsked([new Date(2026, 8, 14, 10, 0).getTime()]);
  });

  it.each([
    { cas: 'down to the nearest five minutes', clientX: 504, heure: new Date(2026, 8, 14, 10, 0) },
    { cas: 'up to the nearest five minutes', clientX: 513, heure: new Date(2026, 8, 14, 10, 5) },
  ])('should round the instant of the click $cas', async ({ clientX, heure }) => {
    const dossier = {
      journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:00'), pointageFixture('fin-12', 'ARRET', '12:00')],
      activites: [],
    };
    await whenRenderingTheFrise(dossier, undefined, undefined, placementFixture());

    whenClickingThePointagesRowAt(clientX);

    thenThePlacementsAsked([heure.getTime()]);
  });

  it('should ask for nothing when the click lands while the placement is disabled', async () => {
    const dossier = {
      journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:00'), pointageFixture('fin-12', 'ARRET', '12:00')],
      activites: [],
    };
    await whenRenderingTheFrise(dossier, undefined, undefined, placementFixture({ desactivee: true }));

    whenClickingThePointagesRowAt(500);

    thenThePlacementsAsked([]);
  });

  it('should draw no placement row while no instant waits to be placed', async () => {
    const dossier = {
      journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:00'), pointageFixture('fin-12', 'ARRET', '12:00')],
      activites: [],
    };

    await whenRenderingTheFrise(dossier);

    thenNoPlacementRowIsDrawn();
  });

  it('should select the pointage of a marker pressed on the placement row without asking to place anything', async () => {
    const dossier = {
      journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:00'), pointageFixture('fin-12', 'ARRET', '12:00')],
      activites: [],
    };
    await whenRenderingTheFrise(dossier, undefined, undefined, placementFixture());

    whenPressing(marker('debut-8'));

    thenThePlacementsAsked([]);
    expect(requestedSelections).toEqual([{ kind: 'POINTAGE', id: 'debut-8' }]);
  });

  it('should extend the scale to three hours after the last received instant while an instant waits to be placed', async () => {
    const dossier = {
      journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:00'), pointageFixture('fin-12', 'ARRET', '12:00')],
      activites: [],
    };

    await whenRenderingTheFrise(
      dossier,
      undefined,
      undefined,
      placementFixture({ bornes: { min: instantAt('08:00'), max: instantLocalFixture(new Date(2026, 9, 5, 10, 0)) } }),
    );

    thenTheGraduationsAre(['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00']);
  });

  it('should stretch the placement row over the rows of the markers and stop above the bars', async () => {
    const dossier = {
      journal: [
        pointageFixture('p-1', 'DEMARRAGE', '08:00'),
        pointageFixture('p-2', 'PASSAGE_NC', '08:20'),
        pointageFixture('p-3', 'ARRET', '12:00'),
      ],
      activites: [activiteFixture('a-1', 'ECHUE', '08:00', '12:00')],
    };

    await whenRenderingTheFrise(dossier, undefined, undefined, placementFixture());

    thenThePlacementRowCovers(['p-1', 'p-2', 'p-3'], 'a-1');
  });

  it('should draw the handle of the proposed instant as a slider', async () => {
    const dossier = {
      journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:00'), pointageFixture('fin-17', 'ARRET', '17:00')],
      activites: [],
    };

    await whenRenderingTheFrise(dossier, undefined, poigneeFixture('12:00'));

    thenTheHandleIsASlider();
  });

  it('should extend the scale to three hours after the last received instant while a handle is active', async () => {
    const dossier = {
      journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:00'), pointageFixture('fin-12', 'ARRET', '12:00')],
      activites: [],
    };

    await whenRenderingTheFrise(dossier, undefined, poigneeFixture('10:00'));

    thenTheGraduationsAre(['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00']);
  });

  it('should keep the normal scale when the clock stands before the last received instant', async () => {
    const dossier = {
      journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:00'), pointageFixture('fin-12', 'ARRET', '12:00')],
      activites: [],
    };

    await whenRenderingTheFrise(
      dossier,
      undefined,
      poigneeFixture('10:00', { bornes: { min: instantAt('08:00'), max: instantAt('10:00') } }),
    );

    thenTheGraduationsAre(['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00']);
  });

  it('should extend the scale only up to the hour that follows the clock', async () => {
    const dossier = {
      journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:00'), pointageFixture('fin-12', 'ARRET', '12:00')],
      activites: [],
    };

    await whenRenderingTheFrise(
      dossier,
      undefined,
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
      const dossier = {
        journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:00'), pointageFixture('fin-12', 'ARRET', '12:00')],
        activites: [],
      };

      await whenRenderingTheFrise(dossier, undefined, poigneeFixture('10:00', { instant: instantLocalFixture(instant) }));

      thenTheHandleHoldsAt(tenue);
    },
  );

  it('should give the handle a range, a value and a readable time within its bounds', async () => {
    const dossier = {
      journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:00'), pointageFixture('fin-12', 'ARRET', '12:00')],
      activites: [],
    };

    await whenRenderingTheFrise(
      dossier,
      undefined,
      poigneeFixture('10:05', { bornes: { min: instantAt('08:00'), max: instantAt('13:00') } }),
    );

    thenTheHandleReads({
      min: new Date(2026, 8, 14, 8, 0).getTime(),
      max: new Date(2026, 8, 14, 13, 0).getTime(),
      now: new Date(2026, 8, 14, 10, 5).getTime(),
      text: '10:05',
    });
  });

  it.each([
    { cas: 'disabled while an operation is under way', desactivee: true, expected: 'true' },
    { cas: 'enabled otherwise', desactivee: false, expected: 'false' },
  ])('should tell assistive technology that the handle is $cas', async ({ desactivee, expected }) => {
    const dossier = {
      journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:00'), pointageFixture('fin-12', 'ARRET', '12:00')],
      activites: [],
    };

    await whenRenderingTheFrise(dossier, undefined, poigneeFixture('10:00', { desactivee }));

    thenTheHandleIsAriaDisabled(expected);
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
    const dossier = {
      journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:00'), pointageFixture('fin-12', 'ARRET', '12:00')],
      activites: [],
    };
    await whenRenderingTheFrise(dossier, undefined, poigneeFixture('10:00'));

    whenPressingKeyOnTheHandle(touche, maj);

    thenTheMovesAsked([demande]);
  });

  it('should leave the other keys to the browser so that the tab key still leaves the handle', async () => {
    const dossier = {
      journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:00'), pointageFixture('fin-12', 'ARRET', '12:00')],
      activites: [],
    };
    await whenRenderingTheFrise(dossier, undefined, poigneeFixture('10:00'));

    const touche = whenPressingKeyOnTheHandle('Tab');

    thenTheMovesAsked([]);
    thenTheKeyIsLeftToTheBrowser(touche);
  });

  it('should not move a disabled handle by keyboard', async () => {
    const dossier = {
      journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:00'), pointageFixture('fin-12', 'ARRET', '12:00')],
      activites: [],
    };
    await whenRenderingTheFrise(dossier, undefined, poigneeFixture('10:00', { desactivee: true }));

    whenPressingKeyOnTheHandle('ArrowRight');

    thenTheMovesAsked([]);
  });

  it('should ask to move the handle to the instant under the pointer dragging it', async () => {
    const dossier = {
      journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:00'), pointageFixture('fin-12', 'ARRET', '12:00')],
      activites: [],
    };
    await whenRenderingTheFrise(
      dossier,
      undefined,
      poigneeFixture('10:00', { bornes: { min: instantAt('08:00'), max: instantAt('13:00') } }),
    );

    whenDraggingTheHandle({ from: 500, to: 750 });

    thenTheMovesAsked([{ kind: 'VERS', instant: new Date(2026, 8, 14, 11, 30).getTime() }]);
  });

  it.each([
    { cas: 'down to the nearest five minutes', to: 756, heure: new Date(2026, 8, 14, 11, 30) },
    { cas: 'up to the nearest five minutes', to: 762, heure: new Date(2026, 8, 14, 11, 35) },
  ])('should round the instant under the pointer $cas', async ({ to, heure }) => {
    const dossier = {
      journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:00'), pointageFixture('fin-12', 'ARRET', '12:00')],
      activites: [],
    };
    await whenRenderingTheFrise(
      dossier,
      undefined,
      poigneeFixture('10:00', { bornes: { min: instantAt('08:00'), max: instantAt('13:00') } }),
    );

    whenDraggingTheHandle({ from: 500, to });

    thenTheMovesAsked([{ kind: 'VERS', instant: heure.getTime() }]);
  });

  it('should keep the point of the handle that was grabbed under the pointer instead of jumping to its centre', async () => {
    const dossier = {
      journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:00'), pointageFixture('fin-12', 'ARRET', '12:00')],
      activites: [],
    };
    await whenRenderingTheFrise(
      dossier,
      undefined,
      poigneeFixture('10:00', { bornes: { min: instantAt('08:00'), max: instantAt('13:00') } }),
    );

    whenDraggingTheHandle({ from: 520, to: 770 });

    thenTheMovesAsked([{ kind: 'VERS', instant: new Date(2026, 8, 14, 11, 30).getTime() }]);
  });

  it('should ignore a pointer that moves over the handle without having pressed it', async () => {
    const dossier = {
      journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:00'), pointageFixture('fin-12', 'ARRET', '12:00')],
      activites: [],
    };
    await whenRenderingTheFrise(
      dossier,
      undefined,
      poigneeFixture('10:00', { bornes: { min: instantAt('08:00'), max: instantAt('13:00') } }),
    );

    whenMovingThePointerOverTheHandleTo(750);

    thenTheMovesAsked([]);
  });

  it.each(['pointerup', 'pointercancel'])('should stop following the pointer once it ends with %s', async fin => {
    const dossier = {
      journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:00'), pointageFixture('fin-12', 'ARRET', '12:00')],
      activites: [],
    };
    await whenRenderingTheFrise(
      dossier,
      undefined,
      poigneeFixture('10:00', { bornes: { min: instantAt('08:00'), max: instantAt('13:00') } }),
    );
    whenDraggingTheHandle({ from: 500, to: 750 });

    whenTheGestureEndsWith(fin);
    whenMovingThePointerOverTheHandleTo(900);

    thenTheMovesAsked([{ kind: 'VERS', instant: new Date(2026, 8, 14, 11, 30).getTime() }]);
  });

  it('should not follow the pointer on a disabled handle', async () => {
    const dossier = {
      journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:00'), pointageFixture('fin-12', 'ARRET', '12:00')],
      activites: [],
    };
    await whenRenderingTheFrise(
      dossier,
      undefined,
      poigneeFixture('10:00', { desactivee: true, bornes: { min: instantAt('08:00'), max: instantAt('13:00') } }),
    );

    whenDraggingTheHandle({ from: 500, to: 750 });

    thenTheMovesAsked([]);
  });

  it('should capture the pointer that presses the handle so that the drag goes on outside of it', async () => {
    const dossier = {
      journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:00'), pointageFixture('fin-12', 'ARRET', '12:00')],
      activites: [],
    };
    await whenRenderingTheFrise(
      dossier,
      undefined,
      poigneeFixture('10:00', { bornes: { min: instantAt('08:00'), max: instantAt('13:00') } }),
    );
    const captured = givenTheBrowserCapturesPointers();

    whenPressingTheHandleAt(500, 7);

    expect(captured).toEqual([7]);
  });

  it('should give the handle its own row below the markers and above the bars', async () => {
    const dossier = {
      journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:00'), pointageFixture('fin-12', 'ARRET', '08:10')],
      activites: [activiteFixture('travail-8', 'A_RESOUDRE', '08:00')],
    };

    await whenRenderingTheFrise(dossier, undefined, poigneeFixture('10:00'));

    thenTheHandleStandsBelow(['debut-8', 'fin-12'], 'travail-8');
  });

  it('should be tall enough for the handle when no bar lies below it', async () => {
    const dossier = {
      journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:00'), pointageFixture('fin-12', 'ARRET', '12:00')],
      activites: [],
    };

    await whenRenderingTheFrise(dossier, undefined, poigneeFixture('10:00'));

    expect(Number.parseFloat(thePlan().style.height)).toBeGreaterThanOrEqual(topOf(handle()) + 44);
  });

  it.each([
    { cas: 'the handle leaves the instant it corrects', instant: '10:00', expected: 'true' },
    { cas: 'the handle stands back on the instant it corrects', instant: '12:00', expected: 'false' },
  ])('should flag the time of the corrected marker as replaced when $cas', async ({ instant, expected }) => {
    const dossier = {
      journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:00'), pointageFixture('fin-12', 'ARRET', '12:00')],
      activites: [],
    };

    await whenRenderingTheFrise(dossier, undefined, poigneeFixture(instant, { origine: 'fin-12' }));

    thenTheMarkerFlagIs('fin-12', 'data-deplace', expected);
    thenTheMarkerFlagIs('debut-8', 'data-deplace', 'false');
  });

  it('should say in the name of the corrected marker that its time is replaced', async () => {
    const dossier = {
      journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:00'), pointageFixture('fin-12', 'ARRET', '12:00')],
      activites: [],
    };

    await whenRenderingTheFrise(dossier, undefined, poigneeFixture('10:00', { origine: 'fin-12' }));

    thenTheMarkerIsNamed('fin-12', '12:00:00 · Arrêt · heure remplacée');
  });

  it('should name the handle and show the time it stands at', async () => {
    const dossier = {
      journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:00'), pointageFixture('fin-12', 'ARRET', '12:00')],
      activites: [],
    };

    await whenRenderingTheFrise(dossier, undefined, poigneeFixture('10:05'));

    thenTheHandleIsNamedAndShows('Heure proposée du fait', '10:05');
  });

  it('should draw the state after the act under the frise with a title of its own', async () => {
    const dossier = { journal: [], activites: [activiteFixture('travail-8', 'A_RESOUDRE', '08:00')] };
    const apres = { journal: [], activites: [activiteFixture('travail-8', 'TERMINEE', '08:00', '12:00')] };

    await whenRenderingTheFrise(dossier, undefined, undefined, undefined, { avant: dossier, apres });

    thenTheStateAfterTheActIsTitled('Après cet acte');
  });

  it('should draw no state after the act while no preview is available', async () => {
    const dossier = { journal: [], activites: [activiteFixture('travail-8', 'A_RESOUDRE', '08:00')] };

    await whenRenderingTheFrise(dossier);

    thenNoStateAfterTheActIsDrawn();
  });

  it('should draw one bar per activity of the state after the act, in the order of their start', async () => {
    const dossier = { journal: [], activites: [activiteFixture('travail-8', 'A_RESOUDRE', '08:00')] };
    const apres = {
      journal: [],
      activites: [
        activiteFixture('nc-12', 'EN_COURS', '12:00', undefined, 'NON_CONFORMITE'),
        activiteFixture('travail-8', 'TERMINEE', '08:00', '12:00'),
      ],
    };

    await whenRenderingTheFrise(dossier, undefined, undefined, undefined, { avant: dossier, apres });

    thenTheBarsAfterTheActAre(['travail-8', 'nc-12']);
  });

  it.each([
    {
      etat: 'TERMINEE',
      fin: '12:00',
      duree: 'PT4H',
      temps: '',
      nom: 'Travail · lundi 14 septembre à 08:00 → lundi 14 septembre à 12:00 · Terminée · 4 h',
    },
    {
      etat: 'EN_COURS',
      fin: undefined,
      duree: undefined,
      temps: '',
      nom: 'Travail · lundi 14 septembre à 08:00 · En cours · Temps non définitif',
    },
    {
      etat: 'TERMINEE',
      fin: '12:00',
      duree: undefined,
      temps: '',
      nom: 'Travail · lundi 14 septembre à 08:00 → lundi 14 septembre à 12:00 · Terminée',
    },
  ] as const)(
    'should name the bar after the act of an activity $etat by its category, period, state and received time',
    async ({ etat, fin, duree, temps, nom }) => {
      const recue = activiteFixture('travail-8', etat, '08:00', fin);
      const apres = {
        journal: [],
        activites: [
          { ...recue, temps, periode: { ...requiredFixture(recue.periode, 'period'), ...(duree === undefined ? {} : { duree }) } },
        ],
      };

      await whenRenderingTheFrise(apres, undefined, undefined, undefined, { avant: apres, apres });

      thenTheBarAfterTheActIsNamed('travail-8', nom);
    },
  );

  it('should write on the bar after the act its category, its state and its received time', async () => {
    const dossier = { journal: [], activites: [activiteFixture('travail-8', 'A_RESOUDRE', '08:00')] };
    const terminee = activiteFixture('travail-8', 'TERMINEE', '08:00', '12:00');
    const apres = { journal: [], activites: [{ ...terminee, periode: { ...requiredFixture(terminee.periode, 'period'), duree: 'PT4H' } }] };

    await whenRenderingTheFrise(dossier, undefined, undefined, undefined, { avant: dossier, apres });

    thenTheBarAfterTheActReads('travail-8', 'Travail · Terminée · 4 h');
  });

  it.each([
    { etat: 'TERMINEE', fin: '12:00', attendu: 'RECUE' },
    { etat: 'ECHUE', fin: '18:00', attendu: 'AUTOMATIQUE' },
    { etat: 'EN_COURS', fin: undefined, attendu: 'OUVERTE' },
    { etat: 'A_RESOUDRE', fin: '12:00', attendu: 'OUVERTE' },
  ] as const)(
    'should tell by attributes the category, the state and the end $attendu of the bar after the act of an activity $etat',
    async ({ etat, fin, attendu }) => {
      const dossier = { journal: [], activites: [activiteFixture('nc-9', 'A_RESOUDRE', '09:00', undefined, 'NON_CONFORMITE')] };
      const apres = { journal: [], activites: [activiteFixture('nc-9', etat, '09:00', fin, 'NON_CONFORMITE')] };

      await whenRenderingTheFrise(dossier, undefined, undefined, undefined, { avant: dossier, apres });

      thenTheBarAfterTheActHas('nc-9', { 'data-categorie': 'NON_CONFORMITE', 'data-etat': etat, 'data-fin': attendu });
    },
  );

  const withDuration = (activite: ActiviteAnomalie, duree: string): ActiviteAnomalie => ({
    ...activite,
    periode: { ...requiredFixture(activite.periode, 'period'), duree },
  });

  it.each<{ cas: string; avant: ActiviteAnomalie[]; apres: ActiviteAnomalie[]; attendu: 'true' | 'false' }>([
    {
      cas: 'an activity whose received state, start, end and duration stay the same',
      avant: [withDuration(activiteFixture('travail-8', 'TERMINEE', '08:00', '12:00'), 'PT4H')],
      apres: [withDuration(activiteFixture('travail-8', 'TERMINEE', '08:00', '12:00'), 'PT4H')],
      attendu: 'false',
    },
    {
      cas: 'an activity whose state changes',
      avant: [activiteFixture('travail-8', 'A_RESOUDRE', '08:00')],
      apres: [activiteFixture('travail-8', 'EN_COURS', '08:00')],
      attendu: 'true',
    },
    {
      cas: 'an activity whose start changes',
      avant: [activiteFixture('travail-8', 'TERMINEE', '08:00', '12:00')],
      apres: [activiteFixture('travail-8', 'TERMINEE', '09:00', '12:00')],
      attendu: 'true',
    },
    {
      cas: 'an activity whose end changes',
      avant: [activiteFixture('travail-8', 'TERMINEE', '08:00', '12:00')],
      apres: [activiteFixture('travail-8', 'TERMINEE', '08:00', '13:00')],
      attendu: 'true',
    },
    {
      cas: 'an activity that gets an end',
      avant: [activiteFixture('travail-8', 'TERMINEE', '08:00')],
      apres: [activiteFixture('travail-8', 'TERMINEE', '08:00', '12:00')],
      attendu: 'true',
    },
    {
      cas: 'an activity whose duration changes',
      avant: [withDuration(activiteFixture('travail-8', 'TERMINEE', '08:00', '12:00'), 'PT4H')],
      apres: [withDuration(activiteFixture('travail-8', 'TERMINEE', '08:00', '12:00'), 'PT3H')],
      attendu: 'true',
    },
    {
      cas: 'an activity the dossier did not hold',
      avant: [activiteFixture('nc-12', 'A_RESOUDRE', '12:00')],
      apres: [activiteFixture('travail-8', 'EN_COURS', '08:00')],
      attendu: 'true',
    },
  ])('should flag as changed the bar after the act of $cas: $attendu', async ({ avant, apres, attendu }) => {
    const dossier = { journal: [], activites: avant };

    await whenRenderingTheFrise(dossier, undefined, undefined, undefined, { avant: dossier, apres: { journal: [], activites: apres } });

    thenTheBarAfterTheActHas('travail-8', { 'data-modifiee': attendu });
  });

  it('should say in the name of a changed bar after the act that the act changes it, and say nothing of an unchanged one', async () => {
    const dossier = {
      journal: [],
      activites: [
        activiteFixture('travail-8', 'A_RESOUDRE', '08:00'),
        activiteFixture('nc-12', 'EN_COURS', '12:00', undefined, 'NON_CONFORMITE'),
      ],
    };
    const apres = {
      journal: [],
      activites: [
        activiteFixture('travail-8', 'TERMINEE', '08:00', '12:00'),
        activiteFixture('nc-12', 'EN_COURS', '12:00', undefined, 'NON_CONFORMITE'),
      ],
    };

    await whenRenderingTheFrise(dossier, undefined, undefined, undefined, { avant: dossier, apres });

    thenTheBarAfterTheActIsNamed('travail-8', 'Travail · lundi 14 septembre à 08:00 → lundi 14 septembre à 12:00 · Terminée · modifiée');
    thenTheBarAfterTheActIsNamed('nc-12', 'Non-conformité · lundi 14 septembre à 12:00 · En cours · Temps non définitif');
  });

  it('should draw a marker per pointage of the journal after the act, in chronological order, named like the markers above', async () => {
    const dossier = { journal: [pointageFixture('fin-17', 'ARRET', '17:00')], activites: [] };
    const apres = {
      journal: [
        pointageFixture('remplacement-16', 'ARRET', '16:00'),
        pointageFixture('fin-17', 'ARRET', '17:00', {
          annulation: { motif: 'Doublon', auteur: 'gestionnaire', instant: instantAt('18:00') },
        }),
      ],
      activites: [],
    };

    await whenRenderingTheFrise(dossier, undefined, undefined, undefined, { avant: dossier, apres });

    thenTheMarkersAfterTheActAre(['remplacement-16', 'fin-17']);
    thenTheMarkerAfterTheActIsNamed('remplacement-16', '16:00:00 · Arrêt · posé par cet acte');
    thenTheMarkerAfterTheActIsNamed('fin-17', '17:00:00 · Arrêt · annulé');
  });

  it('should flag a cancelled, a non-conformity and a regularised marker after the act as the ones above', async () => {
    const apres = {
      journal: [
        pointageFixture('fin-17', 'ARRET', '17:00', {
          annulation: { motif: 'Doublon', auteur: 'gestionnaire', instant: instantAt('18:00') },
        }),
        pointageFixture('nc-12', 'PASSAGE_NC', '12:00'),
        pointageFixture('reg-19', 'ARRET', '19:00', { regularisation: true }),
      ],
      activites: [],
    };

    await whenRenderingTheFrise(apres, undefined, undefined, undefined, { avant: apres, apres });

    thenTheMarkerAfterTheActHas('fin-17', { 'data-annule': 'true', 'data-non-conformite': 'false' });
    thenTheMarkerAfterTheActHas('nc-12', { 'data-annule': 'false', 'data-non-conformite': 'true' });
    thenTheMarkerAfterTheActHas('reg-19', { 'data-annule': 'false' });
    thenTheMarkerAfterTheActIsNamed('reg-19', '19:00:00 · Arrêt · régularisé');
    thenTheMarkerAfterTheActShows('reg-19', 'R');
    thenTheMarkerAfterTheActShows('fin-17', '■17:00');
  });

  it('should not carry over to the markers after the act the fault, the late flag or the replaced time of the markers above', async () => {
    const dossier = {
      journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:00'), pointageFixture('fin-23', 'ARRET', '23:00')],
      activites: [],
      diagnostics: [diagnosticSur('fin-23')],
      choix: [correctionTardiveFixture('CORRIGER_FIN_TARDIVE', 'fin-23')],
    };
    const apres = {
      journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:00'), pointageFixture('fin-23', 'ARRET', '23:00')],
      activites: [],
    };

    await whenRenderingTheFrise(dossier, undefined, poigneeFixture('22:00', { origine: 'fin-23' }), undefined, { avant: dossier, apres });

    thenTheMarkerAfterTheActIsNamed('fin-23', '23:00:00 · Arrêt');
  });

  it('should mark in green and name as made by the act only the marker after the act that the journal did not hold', async () => {
    const dossier = {
      journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:00'), pointageFixture('fin-17', 'ARRET', '17:00')],
      activites: [],
    };
    const apres = {
      journal: [
        pointageFixture('debut-8', 'DEMARRAGE', '08:00'),
        pointageFixture('fin-17', 'ARRET', '17:00', {
          annulation: { motif: 'Doublon', auteur: 'gestionnaire', instant: instantAt('18:00') },
        }),
        pointageFixture('remplacement-16', 'ARRET', '16:00'),
      ],
      activites: [],
    };

    await whenRenderingTheFrise(dossier, undefined, undefined, undefined, { avant: dossier, apres });

    thenTheMarkerAfterTheActHas('remplacement-16', { 'data-fait-de-l-acte': 'true' });
    thenTheMarkerAfterTheActHas('fin-17', { 'data-fait-de-l-acte': 'false' });
    thenTheMarkerAfterTheActHas('debut-8', { 'data-fait-de-l-acte': 'false' });
    thenTheMarkerAfterTheActIsNamed('remplacement-16', '16:00:00 · Arrêt · posé par cet acte');
  });

  it('should mark no marker after the act in green when the act only cancels a pointage', async () => {
    const dossier = { journal: [pointageFixture('fin-17', 'ARRET', '17:00')], activites: [] };
    const apres = {
      journal: [
        pointageFixture('fin-17', 'ARRET', '17:00', {
          annulation: { motif: 'Doublon', auteur: 'gestionnaire', instant: instantAt('18:00') },
        }),
      ],
      activites: [],
    };

    await whenRenderingTheFrise(dossier, undefined, undefined, undefined, { avant: dossier, apres });

    thenTheMarkerAfterTheActHas('fin-17', { 'data-fait-de-l-acte': 'false', 'data-annule': 'true' });
  });

  it('should draw after the act only the pointages of the anomaly of the state after the act', async () => {
    const dossier = {
      journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:00'), pointageFixture('autre-10', 'PASSAGE_NC', '10:00')],
      perimetre: perimetreDe('debut-8'),
      activites: [],
    };
    const apres = {
      journal: [
        pointageFixture('debut-8', 'DEMARRAGE', '08:00'),
        pointageFixture('autre-10', 'PASSAGE_NC', '10:00'),
        pointageFixture('fin-9', 'ARRET', '09:00'),
      ],
      perimetre: perimetreDe('debut-8', 'fin-9'),
      activites: [],
    };

    await whenRenderingTheFrise(dossier, undefined, undefined, undefined, { avant: dossier, apres });

    thenTheMarkersAre(['debut-8']);
    thenTheMarkersAfterTheActAre(['debut-8', 'fin-9']);
    thenTheMarkerAfterTheActHas('fin-9', { 'data-fait-de-l-acte': 'true' });
  });

  it('should not name as made by the act a pointage the journal already held that the act brings into the anomaly', async () => {
    const dossier = {
      journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:00'), pointageFixture('autre-10', 'PASSAGE_NC', '10:00')],
      perimetre: perimetreDe('debut-8'),
      activites: [],
    };
    const apres = {
      journal: [
        pointageFixture('debut-8', 'DEMARRAGE', '08:00'),
        pointageFixture('autre-10', 'PASSAGE_NC', '10:00'),
        pointageFixture('fin-9', 'ARRET', '09:00'),
      ],
      perimetre: perimetreDe('debut-8', 'fin-9', 'autre-10'),
      activites: [],
    };

    await whenRenderingTheFrise(dossier, undefined, undefined, undefined, { avant: dossier, apres });

    thenTheMarkersAre(['debut-8']);
    thenTheMarkerAfterTheActHas('fin-9', { 'data-fait-de-l-acte': 'true' });
    thenTheMarkerAfterTheActHas('autre-10', { 'data-fait-de-l-acte': 'false' });
  });

  it('should stretch the scale to the pointages and the activities of the state after the act', async () => {
    const dossier = {
      journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:30')],
      activites: [activiteFixture('travail-8', 'EN_COURS', '08:30')],
    };
    const apres = {
      journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:30'), pointageFixture('fin-6', 'ARRET', '06:15')],
      activites: [activiteFixture('travail-8', 'TERMINEE', '08:30', '10:45')],
    };

    await whenRenderingTheFrise(dossier, undefined, undefined, undefined, { avant: dossier, apres });

    thenTheGraduationsAre(['05:00', '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00']);
  });

  it('should stand the state after the act below the rows of the activities received, with its title first', async () => {
    const dossier = {
      journal: [pointageFixture('fin-12', 'ARRET', '12:00')],
      activites: [
        activiteFixture('travail-8', 'A_RESOUDRE', '08:00'),
        activiteFixture('nc-9', 'A_RESOUDRE', '09:00', undefined, 'NON_CONFORMITE'),
      ],
    };
    const apres = {
      journal: [pointageFixture('fin-12', 'ARRET', '12:00')],
      activites: [
        activiteFixture('travail-8', 'TERMINEE', '08:00', '12:00'),
        activiteFixture('nc-9', 'TERMINEE', '09:00', '12:00', 'NON_CONFORMITE'),
      ],
    };

    await whenRenderingTheFrise(dossier, undefined, undefined, undefined, { avant: dossier, apres });

    thenTheStateAfterTheActStandsBelow('nc-9');
    thenTheRowsAfterTheActAreStacked(['fin-12'], ['travail-8', 'nc-9']);
  });

  it('should be tall enough for the last bar after the act', async () => {
    const dossier = {
      journal: [pointageFixture('fin-12', 'ARRET', '12:00')],
      activites: [activiteFixture('travail-8', 'A_RESOUDRE', '08:00')],
    };
    const apres = { journal: dossier.journal, activites: [activiteFixture('travail-8', 'TERMINEE', '08:00', '12:00')] };

    await whenRenderingTheFrise(dossier, undefined, undefined, undefined, { avant: dossier, apres });

    expect(Number.parseFloat(thePlan().style.height)).toBeGreaterThanOrEqual(
      topOf(stateAfterTheAct()) + topOf(barAfterTheAct('travail-8')) + 44,
    );
  });

  it('should keep the handle below the markers and above the bars while the state after the act is drawn under them', async () => {
    const dossier = {
      journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:00'), pointageFixture('fin-12', 'ARRET', '12:00')],
      activites: [activiteFixture('travail-8', 'A_RESOUDRE', '08:00')],
    };
    const apres = { journal: dossier.journal, activites: [activiteFixture('travail-8', 'TERMINEE', '08:00', '10:00')] };

    await whenRenderingTheFrise(dossier, undefined, poigneeFixture('10:00'), undefined, { avant: dossier, apres });

    thenTheHandleStandsBelow(['debut-8', 'fin-12'], 'travail-8');
    expect(topOf(stateAfterTheAct())).toBeGreaterThanOrEqual(topOf(bar('travail-8')) + 44);
  });

  it('should keep the scale extended by the handle and stretched by the state after the act', async () => {
    const dossier = {
      journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:00'), pointageFixture('fin-12', 'ARRET', '12:00')],
      activites: [],
    };
    const apres = {
      journal: [...dossier.journal, pointageFixture('fin-13', 'ARRET', '13:00')],
      activites: [],
    };

    await whenRenderingTheFrise(dossier, undefined, poigneeFixture('10:00'), undefined, { avant: dossier, apres });

    thenTheGraduationsAre(['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00']);
  });

  it('should offset by one lane the markers after the act that are closer than a touch target, and push the bars below them', async () => {
    const dossier = { journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:00')], activites: [] };
    const apres = {
      journal: [pointageFixture('p-1', 'ARRET', '12:00'), pointageFixture('p-2', 'ARRET', '12:05')],
      activites: [activiteFixture('travail-8', 'TERMINEE', '08:00', '12:00')],
    };

    await whenRenderingTheFrise(dossier, undefined, undefined, undefined, { avant: dossier, apres });

    thenTheMarkersAfterTheActAreOffsetByALane('p-1', 'p-2');
    thenTheRowsAfterTheActAreStacked(['p-1', 'p-2'], ['travail-8']);
  });

  it('should keep on one lane the markers after the act that the reference width holds 44 pixels apart', async () => {
    const dossier = { journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:00')], activites: [] };
    const apres = {
      journal: [pointageFixture('p-1', 'ARRET', '12:00'), pointageFixture('p-2', 'ARRET', '12:30')],
      activites: [],
    };

    await whenRenderingTheFrise(dossier, undefined, undefined, undefined, { avant: dossier, apres });

    expect(topOf(markerAfterTheAct('p-2'))).toBe(topOf(markerAfterTheAct('p-1')));
  });

  it('should offset by a lane the markers after the act that the width of the frise holds closer than 44 pixels', async () => {
    const dossier = { journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:00')], activites: [] };
    const apres = {
      journal: [pointageFixture('p-1', 'ARRET', '12:00'), pointageFixture('p-2', 'ARRET', '12:30')],
      activites: [],
    };
    await whenRenderingTheFrise(dossier, undefined, undefined, undefined, { avant: dossier, apres });

    await whenTheFriseIsMeasured(390);

    thenTheMarkersAfterTheActAreOffsetByALane('p-1', 'p-2');
  });

  it('should offset by a lane the markers after the act that the left edge pushes closer than a touch target', async () => {
    const dossier = { journal: [pointageLe('debut-8', 'DEMARRAGE', 14, '08:00')], activites: [] };
    const apres = {
      journal: [
        pointageLe('p-1', 'DEMARRAGE', 14, '08:00'),
        pointageLe('p-2', 'PASSAGE_NC', 14, '11:30'),
        pointageLe('p-3', 'ARRET', 15, '10:00'),
      ],
      activites: [],
    };
    await whenRenderingTheFrise(dossier, undefined, undefined, undefined, { avant: dossier, apres });

    await whenTheFriseIsMeasured(356);

    thenTheMarkersAfterTheActAreOffsetByALane('p-1', 'p-2');
  });

  it('should leave the markers and the bars after the act out of the tab order and out of the selection', async () => {
    const dossier = {
      journal: [pointageFixture('fin-17', 'ARRET', '17:00')],
      activites: [activiteFixture('travail-8', 'A_RESOUDRE', '08:00')],
    };
    const apres = { journal: dossier.journal, activites: [activiteFixture('travail-8', 'TERMINEE', '08:00', '17:00')] };

    await whenRenderingTheFrise(dossier, undefined, undefined, undefined, { avant: dossier, apres });
    whenPressing(markerAfterTheAct('fin-17'));
    whenPressing(barAfterTheAct('travail-8'));

    thenTheTabOrderIs(['Travail · lundi 14 septembre à 08:00 · À résoudre', '17:00:00 · Arrêt']);
    expect(requestedSelections).toEqual([]);
  });

  it('should give the state after the act the height of its title, its markers and its bars', async () => {
    const dossier = { journal: [pointageFixture('debut-8', 'DEMARRAGE', '08:00')], activites: [] };
    const apres = {
      journal: [pointageFixture('fin-12', 'ARRET', '12:00')],
      activites: [activiteFixture('travail-8', 'TERMINEE', '08:00', '12:00')],
    };

    await whenRenderingTheFrise(dossier, undefined, undefined, undefined, { avant: dossier, apres });

    thenTheStateAfterTheActEndsWithItsLowestElement(['fin-12'], ['travail-8']);
  });

  const whenRenderingTheFrise = async (
    dossier: VueDeTest,
    selection?: SelectionDuDossier,
    poignee?: PoigneeDeFrise,
    placement?: PlacementDeLInstant,
    apercu?: { readonly avant: VueDeTest; readonly apres: VueDeTest },
  ): Promise<void> => {
    fixture = TestBed.createComponent(FriseDossier);
    fixture.componentRef.setInput('apercu', apercu === undefined ? undefined : { avant: vueDe(apercu.avant), apres: vueDe(apercu.apres) });
    fixture.componentRef.setInput('dossier', vueDe(dossier));
    fixture.componentRef.setInput('poignee', poignee);
    fixture.componentRef.setInput('placement', placement);
    fixture.componentRef.setInput('now', new Date(2026, 9, 5, 10, 0));
    fixture.componentRef.setInput('selection', selection);
    fixture.componentInstance.selectionDemandee.subscribe(demandee => requestedSelections.push(demandee));
    fixture.componentInstance.deplacementDemande.subscribe(demande => requestedMoves.push(demande));
    fixture.componentInstance.placementDemande.subscribe(demande => requestedPlacements.push(demande));
    await fixture.whenStable();
  };

  const whenTheFriseIsMeasured = async (width: number): Promise<void> => {
    resizeObserver.announce(width);
    await fixture.whenStable();
  };

  const whenDestroyingTheFrise = (): void => {
    fixture.destroy();
  };

  const whenPressing = (element: HTMLElement): void => {
    element.click();
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

  const whenClickingThePointagesRowAt = (clientX: number): void => {
    thePlan().getBoundingClientRect = () => new DOMRect(0, 0, PLAN_WIDTH, 200);
    requiredFixture(
      (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(dataSelector('anomalie-frise-placement')),
      'placement row',
    ).dispatchEvent(new MouseEvent('click', { clientX, bubbles: true }));
  };

  const thenThePlacementRowCovers = (pointages: readonly string[], activite: string): void => {
    const row = requiredFixture(
      (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(dataSelector('anomalie-frise-placement')),
      'placement row',
    );
    const bas = topOf(row) + Number.parseFloat(row.style.height);
    expect(topOf(row)).toBeLessThanOrEqual(Math.min(...pointages.map(pointage => topOf(marker(pointage)))));
    expect(bas).toBeGreaterThanOrEqual(Math.max(...pointages.map(pointage => topOf(marker(pointage)) + 44)));
    expect(bas).toBeLessThanOrEqual(topOf(bar(activite)));
  };

  const titleOfThePointages = (): HTMLElement | null =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(dataSelector('anomalie-frise-pointages-intitule'));

  const thenThePointagesRowIsTitled = (expected: string): void => {
    expect(requiredFixture(titleOfThePointages(), 'title of the pointages').textContent.trim()).toBe(expected);
  };

  const thenNoTitleIsDrawnForThePointages = (): void => {
    expect(titleOfThePointages()).toBeNull();
  };

  const bottomOfTheTitleOfThePointages = (): number => {
    const title = requiredFixture(titleOfThePointages(), 'title of the pointages');
    return topOf(title) + Number.parseFloat(title.style.height);
  };

  const thenTheTitleOfThePointagesStandsAbove = (pointages: readonly string[]): void => {
    expect(bottomOfTheTitleOfThePointages()).toBeLessThanOrEqual(Math.min(...pointages.map(pointage => topOf(marker(pointage)))));
  };

  const thenThePlacementRowStartsUnderTheTitleOfThePointages = (): void => {
    const row = requiredFixture(
      (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(dataSelector('anomalie-frise-placement')),
      'placement row',
    );
    expect(topOf(row)).toBeGreaterThanOrEqual(bottomOfTheTitleOfThePointages());
  };

  const thenNoPlacementRowIsDrawn = (): void => {
    expect((fixture.nativeElement as HTMLElement).querySelector(dataSelector('anomalie-frise-placement'))).toBeNull();
  };

  const thenThePlacementsAsked = (expected: readonly number[]): void => {
    expect(requestedPlacements.map(demande => demande.instant)).toEqual(expected);
  };

  const whenTheGestureEndsWith = (type: string, pointerId = 1): void => {
    handle().dispatchEvent(new PointerEvent(type, { pointerId, bubbles: true }));
  };

  const whenPressingKeyOnTheHandle = (key: string, shiftKey = false): KeyboardEvent => {
    const touche = new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true });
    handle().dispatchEvent(touche);
    return touche;
  };

  const thenTheHandleIsAriaDisabled = (expected: string): void => {
    expect(handle().getAttribute('aria-disabled')).toBe(expected);
  };

  const thenTheKeyIsLeftToTheBrowser = (touche: KeyboardEvent): void => {
    expect(touche.defaultPrevented).toBe(false);
  };

  const thenTheMovesAsked = (expected: readonly DemandeDeDeplacement[]): void => {
    expect(requestedMoves.map(deplacement => deplacement.demande)).toEqual(expected);
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

  const thenTheHandleStandsBelow = (pointages: readonly string[], activite: string): void => {
    const haut = topOf(handle());
    expect(haut).toBeGreaterThanOrEqual(Math.max(...pointages.map(pointage => topOf(marker(pointage)) + 44)));
    expect(topOf(bar(activite))).toBeGreaterThanOrEqual(haut + 44);
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

  const thenTheLateBadgeIsDrawnOn = (pointage: string): void => {
    expect(lateBadgeOf(pointage)).not.toBeNull();
  };

  const thenNoLateBadgeIsDrawnOn = (pointage: string): void => {
    expect(lateBadgeOf(pointage)).toBeNull();
  };

  const lateBadgeOf = (pointage: string): HTMLElement | null =>
    marker(pointage).querySelector<HTMLElement>(dataSelector('anomalie-pointage-tardif'));

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

  const thenTheMarkersStandOnRows = (rows: readonly (readonly string[])[]): void => {
    const tops = rows.map(row => row.map(pointage => topOf(marker(pointage))));
    expect(tops.map(row => new Set(row).size)).toEqual(tops.map(() => 1));
    const firsts = tops.map(row => row[0] ?? Number.NaN);
    expect(firsts).toEqual([...firsts].sort((first, second) => first - second));
    expect(new Set(firsts).size).toBe(firsts.length);
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

  const thenTheArrowsAreDecorative = (): void => {
    const [arrow] = arrows();
    expect(requiredFixture(arrow, 'arrow').closest('svg')?.getAttribute('aria-hidden')).toBe('true');
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

  const thenTheStateAfterTheActIsTitled = (expected: string): void => {
    const titre = requiredFixture(
      (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(dataSelector('anomalie-frise-apres-titre')),
      'title of the state after the act',
    );
    expect(titre.textContent.trim()).toBe(expected);
  };

  const thenNoStateAfterTheActIsDrawn = (): void => {
    expect((fixture.nativeElement as HTMLElement).querySelector(dataSelector('anomalie-frise-apres'))).toBeNull();
  };

  const barsAfterTheAct = (): HTMLElement[] => [
    ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(dataSelector('anomalie-apercu-activite-apres')),
  ];

  const thenTheBarsAfterTheActAre = (expected: readonly string[]): void => {
    expect(barsAfterTheAct().map(bar => bar.dataset['activite'])).toEqual(expected);
  };

  const barAfterTheAct = (activite: string): HTMLElement =>
    requiredFixture(
      barsAfterTheAct().find(candidate => candidate.dataset['activite'] === activite),
      `bar after the act of ${activite}`,
    );

  const thenTheBarAfterTheActIsNamed = (activite: string, expected: string): void => {
    expect(barAfterTheAct(activite).getAttribute('aria-label')).toBe(expected);
  };

  const thenTheBarAfterTheActReads = (activite: string, expected: string): void => {
    expect(barAfterTheAct(activite).textContent.replace(/\s+/g, ' ').trim()).toBe(expected);
  };

  const thenTheBarAfterTheActHas = (activite: string, expected: Readonly<Record<string, string>>): void => {
    const bar = barAfterTheAct(activite);
    expect(Object.fromEntries(Object.keys(expected).map(attribut => [attribut, bar.getAttribute(attribut)]))).toEqual(expected);
  };

  const markersAfterTheAct = (): HTMLElement[] => [
    ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(dataSelector('anomalie-apres-pointage')),
  ];

  const thenTheMarkersAfterTheActAre = (expected: readonly string[]): void => {
    expect(markersAfterTheAct().map(marker => marker.dataset['pointage'])).toEqual(expected);
  };

  const markerAfterTheAct = (pointage: string): HTMLElement =>
    requiredFixture(
      markersAfterTheAct().find(candidate => candidate.dataset['pointage'] === pointage),
      `marker after the act of ${pointage}`,
    );

  const thenTheMarkerAfterTheActIsNamed = (pointage: string, expected: string): void => {
    expect(markerAfterTheAct(pointage).getAttribute('aria-label')).toBe(expected);
  };

  const thenTheMarkerAfterTheActHas = (pointage: string, expected: Readonly<Record<string, string>>): void => {
    const marker = markerAfterTheAct(pointage);
    expect(Object.fromEntries(Object.keys(expected).map(attribut => [attribut, marker.getAttribute(attribut)]))).toEqual(expected);
  };

  const thenTheMarkerAfterTheActShows = (pointage: string, expected: string): void => {
    expect(markerAfterTheAct(pointage).textContent.replace(/\s+/g, ' ')).toContain(expected);
  };

  const stateAfterTheAct = (): HTMLElement =>
    requiredFixture(
      (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(dataSelector('anomalie-frise-apres')),
      'state after the act',
    );

  const thenTheStateAfterTheActStandsBelow = (activite: string): void => {
    expect(topOf(stateAfterTheAct())).toBeGreaterThanOrEqual(topOf(bar(activite)) + 44);
  };

  const thenTheRowsAfterTheActAreStacked = (pointages: readonly string[], activites: readonly string[]): void => {
    const markerTops = pointages.map(pointage => topOf(markerAfterTheAct(pointage)));
    const barTops = activites.map(activite => topOf(barAfterTheAct(activite)));
    const gaps = barTops.slice(1).map((top, rang) => top - requiredFixture(barTops[rang], 'previous bar'));
    expect(Math.min(...markerTops)).toBeGreaterThan(0);
    expect(Math.min(...barTops)).toBeGreaterThanOrEqual(Math.max(...markerTops) + 44);
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(44);
  };

  const thenTheMarkersAfterTheActAreOffsetByALane = (first: string, second: string): void => {
    expect(topOf(markerAfterTheAct(second))).toBe(topOf(markerAfterTheAct(first)) + 44);
  };

  const thenTheStateAfterTheActEndsWithItsLowestElement = (pointages: readonly string[], activites: readonly string[]): void => {
    const tops = [
      ...pointages.map(pointage => topOf(markerAfterTheAct(pointage))),
      ...activites.map(activite => topOf(barAfterTheAct(activite))),
    ];
    expect(Number.parseFloat(stateAfterTheAct().style.height)).toBe(Math.max(...tops) + 44);
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

    it('should graduate the extended scale hour by hour across midnight and the hour the clock repeats', async () => {
      const pointage = (id: string, instant: Date): PointageAnomalie => ({
        ...pointageFixture(id, 'DEMARRAGE', '00:00'),
        fait: { ...pointageFixture(id, 'DEMARRAGE', '00:00').fait, instant: instant.toISOString() },
      });
      const dossier = {
        journal: [pointage('p-1', new Date(Date.UTC(2026, 9, 24, 21, 0))), pointage('p-2', new Date(Date.UTC(2026, 9, 24, 22, 30)))],
        activites: [],
      };
      const bornes = {
        min: new Date(Date.UTC(2026, 9, 24, 21, 0)).toISOString(),
        max: new Date(Date.UTC(2026, 9, 25, 12, 0)).toISOString(),
      };

      await whenRenderingTheFrise(
        dossier,
        undefined,
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
        activites: [],
      };
      const bornes = {
        min: new Date(Date.UTC(2026, 9, 24, 21, 0)).toISOString(),
        max: new Date(Date.UTC(2026, 9, 25, 5, 0)).toISOString(),
      };

      await whenRenderingTheFrise(dossier, undefined, poigneeFixture('00:00', { instant: instant.toISOString(), bornes }));

      thenTheHandleIsReadAs(texte);
    });

    it('should graduate every two hours the day the clock repeats an hour, without two graduations closer than 64 pixels', async () => {
      const dossier = {
        journal: [unPointageA('p-1', new Date(Date.UTC(2026, 9, 24, 23, 30))), unPointageA('p-2', new Date(Date.UTC(2026, 9, 25, 1, 30)))],
        activites: [],
      };
      await whenRenderingTheFrise(dossier);

      await whenTheFriseIsMeasured(200);

      thenTheGraduationsStandAt([0, 40, 100]);
      thenNoTwoGraduationsAreCloserThan(64, 200);
    });

    it('should graduate every three hours the day the clock skips an hour, without two graduations closer than 64 pixels', async () => {
      const dossier = {
        journal: [unPointageA('p-1', new Date(Date.UTC(2026, 2, 28, 23, 30))), unPointageA('p-2', new Date(Date.UTC(2026, 2, 29, 2, 30)))],
        activites: [],
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
        activites: [],
      };
      await whenRenderingTheFrise(dossier);

      await whenTheFriseIsMeasured(400);

      thenTheGraduationsStandAt([12.5, 50, 75, 100]);
      thenTheDaysShownCountIs(1);
    });
  });
});
