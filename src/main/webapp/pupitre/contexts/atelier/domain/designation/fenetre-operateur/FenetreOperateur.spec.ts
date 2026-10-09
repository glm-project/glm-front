import { IdentiteDeFenetre } from '@/pupitre/contexts/atelier/domain/designation/IdentiteDeFenetre';
import { Entreprise } from '../../journal-du-pupitre/Entreprise';
import {
  ActiviteDuPupitre,
  EMPTY_JOURNAL_DU_PUPITRE,
  GesteDePointage,
  IdentiteDuGeste,
  JournalDuPupitre,
  Suspension,
} from '../../journal-du-pupitre/JournalDuPupitre';
import { Identifiant } from '../Identifiant';
import { IntentionGlobaleInitiee } from '../IntentionGlobaleInitiee';
import { NumeroDElement } from '../NumeroDElement';
import { CommandesGlobales } from './CommandesGlobales';
import { IntentionGlobaleDAtelier } from './ContexteDeGesteDAtelier';
import { DecisionDePointage, LotDeGestesDAtelier } from './DecisionDePointage';
import { FenetreOperateur } from './FenetreOperateur';
import { ElementDePointage, VueDePointage } from './VueDePointage';

const dureeMaximaleFixtureEnMs = 13 * 60 * 60 * 1000;

const isMissingFixture = (value: unknown): value is null | undefined => value === null || value === undefined;

const requiredFixture = <T>(value: T | null | undefined, description: string): T => {
  if (isMissingFixture(value)) {
    throw new Error(`Missing ${description} fixture.`);
  }
  return value;
};

const acceptedFixture = (geste: GesteDePointage): JournalDuPupitre['evenements'][number] => ({ geste, etat: 'ACCEPTE' });

const travailAuTourFixture: ActiviteDuPupitre = {
  ouverture: 'activite-fixture-14',
  echeance: '2026-09-05T19:00:00.000Z',
  operateurId: 'jean',
  categorie: 'TRAVAIL',
  depuis: '2026-09-05T06:00:00Z',
  posteId: 'tour',
};

const nonConformiteFixture: ActiviteDuPupitre = {
  ouverture: 'activite-fixture-15',
  echeance: '2026-09-05T21:30:00.000Z',
  operateurId: 'jean',
  categorie: 'NON_CONFORMITE',
  depuis: '2026-09-05T08:30:00Z',
};

const travailALaFraiseuseFixture: ActiviteDuPupitre = {
  ouverture: 'activite-fixture-21',
  echeance: '2026-09-05T20:00:00.000Z',
  operateurId: 'jean',
  categorie: 'TRAVAIL',
  depuis: '2026-09-05T07:00:00Z',
  posteId: 'fraiseuse',
};

const POINTAGE_IGNORE = 'pointage-ignore';
const SUIVI_CLOTURE = 'suivi-d-atelier-cloture';
type MotifFixture = typeof POINTAGE_IGNORE | typeof SUIVI_CLOTURE;
const vueFixture: JournalDuPupitre = {
  ...EMPTY_JOURNAL_DU_PUPITRE,
  referentiel: {
    operateurs: [
      {
        id: 'jean',
        nom: 'Dupont',
        prenom: 'Jean',
        identifiant: '049',
        postes: [{ id: 'tour', libelle: 'Tour' }],
      },
    ],
    suivis: [
      {
        id: 'moule-1015',
        nom: 'PR-2026-000015',
        reference: '1015',
        etat: 'EN_COURS',
        categorie: 'MOULE',
        activites: [
          {
            ouverture: 'activite-fixture-16',
            echeance: '2026-09-05T19:00:00.000Z',
            operateurId: 'jean',
            categorie: 'TRAVAIL',
            depuis: '2026-09-05T06:00:00Z',
            posteId: 'tour',
          },
          {
            ouverture: 'activite-fixture-17',
            echeance: '2026-09-05T18:00:00.000Z',
            operateurId: 'marc',
            categorie: 'NON_CONFORMITE',
            depuis: '2026-09-05T05:00:00Z',
          },
        ],
        evenements: [],
      },
      {
        id: 'of-204',
        nom: 'OF-2026-000204',
        reference: '204',
        etat: 'EN_COURS',
        categorie: 'OF',
        activites: [
          {
            ouverture: 'activite-fixture-18',
            echeance: '2026-09-05T21:30:00.000Z',
            operateurId: 'jean',
            categorie: 'NON_CONFORMITE',
            depuis: '2026-09-05T08:30:00Z',
          },
          {
            ouverture: 'activite-fixture-19',
            echeance: '2026-09-05T22:30:00.000Z',
            operateurId: 'jean',
            categorie: 'TRAVAIL',
            depuis: '2026-09-05T09:30:00Z',
            posteId: 'tour',
          },
          {
            ouverture: 'activite-fixture-20',
            echeance: '2026-09-05T21:45:00.000Z',
            operateurId: 'jean',
            categorie: 'NON_CONFORMITE',
            depuis: '2026-09-05T08:45:00Z',
            posteId: 'fraiseuse',
          },
        ],
        evenements: [],
      },
      {
        id: 'of-1015',
        nom: 'OF-2026-000042',
        etat: 'EN_ATTENTE',
        categorie: 'OF',
        activites: [],
        evenements: [],
      },
    ],
    categories: [],
    dureeMaximaleDActiviteEnMs: dureeMaximaleFixtureEnMs,
  },
};

const elementsDeLaZone = (vue: VueDePointage, categorie: string): readonly ElementDePointage[] =>
  vue.zones.find(zone => zone.categorie === categorie)?.elements ?? [];

describe('FenetreOperateur', () => {
  let fenetre: FenetreOperateur;
  let dateDuGeste: string;
  let identities: Map<string, string>;

  beforeEach(() => {
    fenetre = FenetreOperateur.open(
      Entreprise.of('entreprise-a'),
      structuredClone(vueFixture),
      identifiantFixture('049'),
      Date.parse('2026-09-05T09:00:00Z'),
      new IdentiteDeFenetre(1),
    );
    dateDuGeste = '2026-09-05T08:00:00Z';
    identities = new Map<string, string>();
  });

  it('should schedule the earliest eligible personal deadline and no deadline once every activity expires', () => {
    const deadlines = [
      fenetre.prochaineEcheance(),
      fenetre.afterEvaluatingActivities(Date.parse('2026-09-05T19:00:00Z')).prochaineEcheance(),
      fenetre.afterEvaluatingActivities(Date.parse('2026-09-05T22:30:00Z')).prochaineEcheance(),
    ];

    expect(deadlines).toEqual([Date.parse('2026-09-05T19:00:00Z'), Date.parse('2026-09-05T21:30:00Z'), undefined]);
  });

  it('should schedule the deadline of an activity opened here from the maximum duration received with the reference', () => {
    const window = givenAWindowOpenedOn({
      ...vueFixture,
      referentiel: { ...requiredFixture(vueFixture.referentiel, 'reference'), dureeMaximaleDActiviteEnMs: 8 * 60 * 60 * 1000 },
    });

    const started = window.afterDeciding('of-1015', 'PRINCIPALE', identifyFixture, Date.parse('2026-09-05T09:00:00Z'));
    const accepted = started.fenetre.prepareAcceptance(gesturesOf(started.decision)).applyTo(started.fenetre);

    expect(accepted.prochaineEcheance()).toBe(Date.parse('2026-09-05T16:00:00Z'));
  });

  it('should request no resumption invalidation when accepting an ordinary opening', () => {
    const decision = whenDeciding('of-1015', 'PRINCIPALE');

    const accepted = fenetre.prepareAcceptance(gesturesOf(decision));

    expect(accepted).not.toHaveProperty('repriseAEffacer');
    expect(accepted.gestes).toMatchObject([{ type: 'DEBUT', suiviId: 'of-1015' }]);
  });

  it('should capture only one activity opening for the first operator action', () => {
    const decision = whenDeciding('of-1015', 'PRINCIPALE');

    const gestes = captureGestures(decision);

    expect(gestes).toHaveLength(1);
    expect(gestes[0]).toMatchObject({ nature: 'POINTAGE', type: 'DEBUT' });
  });

  it('should finish the stable original opening of the displayed activity', () => {
    const corrected = { ...travailAuTourFixture, ouverture: 'original-opening' };
    const window = givenAWindowWithActivities({ 'moule-1015': [corrected] });

    const decision = whenDecidingWith(window, 'moule-1015', 'PRINCIPALE');

    expect(captureGestures(decision)).toMatchObject([{ type: 'FIN' }]);
  });

  it('should decide a new opening at the inclusive thirteen-hour deadline even before any timer callback', () => {
    const window = givenAWindowWithActivities({ 'moule-1015': [travailAuTourFixture] });
    const instant = Date.parse('2026-09-05T19:00:00Z');
    const identite = { id: 'nouvelle-ouverture', dateDeSurvenue: '2026-09-05T19:00:00Z' };

    const result = window.afterDeciding('moule-1015', 'PRINCIPALE', () => identite, instant);

    expect(captureGestures(result.decision)).toEqual([
      {
        ...identite,
        nature: 'POINTAGE',
        operateurId: 'jean',
        suiviId: 'moule-1015',
        posteId: 'tour',
        type: 'DEBUT',
      },
    ]);
  });

  it('should retain the frozen duration while reevaluating an activity before its deadline', () => {
    const window = givenAWindowWithActivities({ 'moule-1015': [travailAuTourFixture] });

    const reevaluated = window.afterEvaluatingActivities(Date.parse('2026-09-05T18:59:59.999Z'));

    expect(
      elementsDeLaZone(reevaluated.pointage(), 'MOULE')
        .find(element => element.id === 'moule-1015')
        ?.dureeMs(),
    ).toBe(3 * 60 * 60 * 1000);
    expect(reevaluated.prochaineEcheance()).toBe(Date.parse('2026-09-05T19:00:00Z'));
  });

  it('should keep the target and occurrence of a finish initiated before expiry when it is accepted afterwards', () => {
    const window = givenAWindowWithActivities({ 'moule-1015': [travailAuTourFixture] });
    const instant = Date.parse('2026-09-05T18:59:59.999Z');
    const identite = { id: 'fin-avant-echeance', dateDeSurvenue: new Date(instant).toISOString() };
    const prepared = window.afterDeciding('moule-1015', 'PRINCIPALE', () => identite, instant);

    const captured = prepared.fenetre.afterEvaluatingActivities(instant + 1_000).prepareAcceptance(gesturesOf(prepared.decision));

    expect(captured.gestes).toEqual([
      {
        ...identite,
        nature: 'POINTAGE',
        operateurId: 'jean',
        suiviId: 'moule-1015',
        posteId: 'tour',
        type: 'FIN',
      },
    ]);
  });

  it('should pause only known nonexpired activities', () => {
    const journal = structuredClone(vueFixture);
    const reference = requiredFixture(journal.referentiel, 'reference');
    const first = requiredFixture(reference.suivis[0], 'first item');
    const window = givenAWindowOpenedOn({
      ...journal,
      referentiel: {
        ...reference,
        suivis: [
          {
            ...first,
            activites: [
              travailAuTourFixture,
              { ...travailAuTourFixture, ouverture: 'encore-active', posteId: 'fraiseuse', echeance: '2026-09-05T22:00:00Z' },
            ],
          },
        ],
      },
    });
    const intention = new IntentionGlobaleInitiee('PAUSE', {
      id: '11111111-2222-4333-8444-55550000000a',
      dateDeSurvenue: '2026-09-05T19:00:00Z',
    });

    const gestes = intention.prepare(window).capture();

    expect(gestes).toMatchObject([{ type: 'FIN', posteId: 'fraiseuse' }]);
    expect(gestes).toHaveLength(1);
  });

  it('should resolve the operator from the company referential', () => {
    const operateur = whenResolvingTheOperator();

    thenOperatorIsJean(operateur.id);
  });

  it('should refuse new gestures at every initiation boundary while a global capture is pending', () => {
    const globale = new IntentionGlobaleInitiee('TOUT_ARRETER', {
      id: '11111111-2222-3333-4444-0000000a',
      dateDeSurvenue: dateDuGeste,
    });

    const pending = fenetre.afterIntendingGlobal(globale);

    expect(() => pending.afterDeciding('moule-1015', 'PRINCIPALE', identifyFixture, Date.parse('2026-09-05T09:00:00Z'))).toThrow(
      'Une commande globale est en cours.',
    );
    expect(() => pending.afterChoosingPoste('of-1015', 'PRINCIPALE', 'tour', identifyFixture, Date.parse('2026-09-05T09:00:00Z'))).toThrow(
      'Une commande globale est en cours.',
    );
    expect(() => pending.afterIntendingGesture()).toThrow('Une commande globale est en cours.');
    expect(() => pending.afterIntendingGlobal(globale)).toThrow('Une commande globale est en cours.');
    expect(fenetre.allowsGestures()).toBe(true);
  });

  it('should expose naturally sorted workshop zones with the operator activity frozen at window opening', () => {
    const pointage = whenReadingThePointageView();

    thenPointageViewIsPersonalAndFrozen(pointage);
  });

  it('should refuse a code absent from a cached referential or without any referential', () => {
    const withReference = whenOpeningAnUnknownOperator(vueFixture);
    const withoutReference = whenOpeningAnUnknownOperator(EMPTY_JOURNAL_DU_PUPITRE);

    thenWindowIsRefused(withReference);
    thenWindowIsRefused(withoutReference);
  });

  it('should refuse a workstation outside the operator’s local qualifications', () => {
    const refusal = whenPointingAtAnUnauthorizedWorkstation();

    thenWorkstationIsRefused(refusal);
  });

  it('should retain activity identities fixed at the operator action while capture waits', () => {
    const first = givenAPreparedPointage();
    const second = givenAPreparedPointage();
    const preparedIdentities = givenTheRecordedIdentities();

    whenAnHourPasses();
    const firstGestures = whenAcceptingPointage(first);
    const secondGestures = whenCapturingPointage(second);

    thenGesturesAre(firstGestures, ['POINTAGE']);
    thenGesturesAre(secondGestures, ['POINTAGE']);
    thenIdentitiesWerePreparedBeforeExecution([...firstGestures, ...secondGestures], preparedIdentities);
    thenOpeningSharesBusinessTime(firstGestures);
  });

  it('should capture a first targeted finish', () => {
    const fin = whenDeciding('moule-1015', 'PRINCIPALE');

    const gestes = captureGestures(fin);

    thenGesturesAre(gestes, ['POINTAGE']);
    thenPointageTypesAre(fin, ['FIN']);
  });

  it('should finish the work then open a non conformity on the same workstation when non conformity is asked during work', () => {
    const nonConformite = whenDeciding('moule-1015', 'SECONDAIRE');

    const gestes = captureGestures(nonConformite);

    thenGesturesAre(gestes, ['POINTAGE', 'POINTAGE']);
    thenTypesAndWorkstationsAre(nonConformite, [
      ['FIN', 'tour'],
      ['NON_CONFORMITE', 'tour'],
    ]);
  });

  it('should finish then open a non conformity on each workstation in turn when several works are running', () => {
    const deuxTravaux = givenAWindowWithActivities({ 'of-204': [travailAuTourFixture, travailALaFraiseuseFixture] });

    const nonConformites = whenDecidingWith(deuxTravaux, 'of-204', 'SECONDAIRE');

    thenTypesAndWorkstationsAre(nonConformites, [
      ['FIN', 'tour'],
      ['NON_CONFORMITE', 'tour'],
      ['FIN', 'fraiseuse'],
      ['NON_CONFORMITE', 'fraiseuse'],
    ]);
  });

  it('should finish then reopen as work each non conformity on its workstation, leaving the work untouched, when the secondary target is asked on a started element', () => {
    const retourAuTravail = whenDeciding('of-204', 'SECONDAIRE');

    const gestes = captureGestures(retourAuTravail);

    thenGesturesAre(gestes, ['POINTAGE', 'POINTAGE', 'POINTAGE', 'POINTAGE']);
    thenTypesAndWorkstationsAre(retourAuTravail, [
      ['FIN', undefined],
      ['DEBUT', undefined],
      ['FIN', 'fraiseuse'],
      ['DEBUT', 'fraiseuse'],
    ]);
  });

  it('should finish every personal activity on its workstation when stopping all', () => {
    const toutArreter = new IntentionGlobaleInitiee('TOUT_ARRETER', {
      id: '11111111-2222-4333-8444-55550000000a',
      dateDeSurvenue: '2026-09-05T08:00:00.000Z',
    }).prepare(fenetre);

    const gestes = toutArreter.capture();

    thenGesturesAre(gestes, ['POINTAGE', 'POINTAGE', 'POINTAGE', 'POINTAGE']);
    expect(gestes.map(geste => ({ suiviId: geste.suiviId, type: geste.type, posteId: geste.posteId }))).toEqual([
      { suiviId: 'moule-1015', type: 'FIN', posteId: 'tour' },
      { suiviId: 'of-204', type: 'FIN', posteId: undefined },
      { suiviId: 'of-204', type: 'FIN', posteId: 'tour' },
      { suiviId: 'of-204', type: 'FIN', posteId: 'fraiseuse' },
    ]);
    expect(new Set(gestes.map(geste => geste.id)).size).toBe(gestes.length);
    expect(new Set(gestes.map(geste => geste.dateDeSurvenue))).toEqual(new Set(['2026-09-05T08:00:00.000Z']));
  });

  it('should suspend each personal activity by a finish on its workstation marked with the pause and its reopening, without arrival nor presence', () => {
    const working = givenAWindowWithActivities({ 'moule-1015': [travailAuTourFixture], 'of-204': [nonConformiteFixture] });

    const gestes = working.preparePause(identifyFixture, 'pause-de-midi').capture();

    thenGesturesAre(gestes, ['POINTAGE', 'POINTAGE']);
    thenPointagesAre(gestes, [
      { suiviId: 'moule-1015', type: 'FIN', posteId: 'tour', suspension: { pause: 'pause-de-midi', reouverture: 'DEBUT' } },
      { suiviId: 'of-204', type: 'FIN', posteId: undefined, suspension: { pause: 'pause-de-midi', reouverture: 'NON_CONFORMITE' } },
    ]);
  });

  it('should reopen every suspended activity on its workstation and in its category', () => {
    const paused = givenAnAcceptedPause(
      givenAWindowWithActivities({ 'moule-1015': [travailAuTourFixture], 'of-204': [nonConformiteFixture] }),
    );

    const gestes = paused.capture(paused.prepareReprise(identifyFixture));

    thenGesturesAre(gestes, ['POINTAGE', 'POINTAGE']);
    thenPointagesAre(gestes, [
      { suiviId: 'moule-1015', type: 'DEBUT', posteId: 'tour', suspension: undefined },
      { suiviId: 'of-204', type: 'NON_CONFORMITE', posteId: undefined, suspension: undefined },
    ]);
  });

  it('should reopen the original activities after a caller changes suspensions in a journal snapshot', () => {
    const paused = givenAnAcceptedPause(
      givenAWindowWithActivities({ 'moule-1015': [travailAuTourFixture], 'of-204': [nonConformiteFixture] }),
    );
    const snapshot = paused.snapshot();

    whenChangingSnapshotSuspension(snapshot, 0, { pause: 'another-pause' });
    whenChangingSnapshotSuspension(snapshot, 1, { reouverture: 'DEBUT' });
    const gestes = paused.capture(paused.prepareReprise(identifyFixture));

    thenPointagesAre(gestes, [
      { suiviId: 'moule-1015', type: 'DEBUT', posteId: 'tour', suspension: undefined },
      { suiviId: 'of-204', type: 'NON_CONFORMITE', posteId: undefined, suspension: undefined },
    ]);
  });

  it('should reopen a pause after another activity was accepted in the window', () => {
    const working = givenAnAcceptedDecision(givenAWindowWithActivities({ 'moule-1015': [travailAuTourFixture] }), 'of-1015', 'PRINCIPALE');
    const paused = givenAnAcceptedPause(working);

    const gestes = paused.capture(paused.prepareReprise(identifyFixture));

    thenGesturesAre(gestes, ['POINTAGE', 'POINTAGE']);
  });

  it('should clear the resumption without a finish when stopping all during a pause', () => {
    const paused = givenAnAcceptedPause(
      givenAWindowWithActivities({ 'moule-1015': [travailAuTourFixture], 'of-204': [nonConformiteFixture] }),
    );

    const acceptation = paused.prepareAcceptance(paused.prepareToutArreter(identifyFixture));
    const stopped = acceptation.applyTo(paused);
    const gestes = acceptation.gestes;

    thenGesturesAre(gestes, []);
    thenGlobalCommandIsPermitted(whenReadingGlobalCommands(stopped), 'REPRENDRE', false);
  });

  it('should stop every activity after another accepted command', () => {
    fenetre = givenAnAcceptedDecision(fenetre, 'of-1015', 'PRINCIPALE');

    const toutArreter = fenetre.capture(fenetre.prepareToutArreter(identifyFixture));

    thenGesturesAre(toutArreter, ['POINTAGE', 'POINTAGE', 'POINTAGE', 'POINTAGE', 'POINTAGE']);
  });

  it('should record no activity gesture when stopping all without an activity', () => {
    fenetre = fenetre.afterReconciling(Entreprise.of('entreprise-a'), EMPTY_JOURNAL_DU_PUPITRE);

    const toutArreter = fenetre.prepareToutArreter(identifyFixture).capture();

    thenGesturesAre(toutArreter, []);
  });

  it('should open an activity after stopping all in the same operator window', () => {
    const stoppedWindow = givenAnAcceptedStopWithoutActivities();

    const gestes = whenStartingAnActivityIn(stoppedWindow);

    thenTheFirstGestureIsAnOpening(gestes);
  });

  it('should expose a refused finish from the current global stop batch as TOUT ARRÊTER', () => {
    const decision = fenetre.prepareToutArreter(identifyFixture);
    const acceptance = fenetre.prepareAcceptance(decision);
    const gestes = acceptance.gestes;
    fenetre = acceptance.applyTo(fenetre);
    const fin = requiredFixture(
      gestes.find(geste => geste.type === 'FIN'),
      'finish gesture',
    );

    whenReconciling({
      ...structuredClone(vueFixture),
      evenements: [{ geste: fin, etat: 'REFUSE', refus: { code: 'suivi-cloture', message: "L'élément a été clôturé." } }],
    });

    expect(fenetre.refusal()).toEqual({
      contexte: { kind: 'COMMANDE_GLOBALE', intention: 'TOUT_ARRETER' },
      message: "L'élément a été clôturé.",
    });
  });

  it.each([
    { intention: 'PAUSE' as const, prepare: (window: FenetreOperateur) => window.preparePause(identifyFixture, 'pause-de-midi') },
    { intention: 'REPRENDRE' as const, prepare: (window: FenetreOperateur) => window.prepareReprise(identifyFixture) },
  ])('should expose a refused pointage of $intention with its originating global command', ({ intention, prepare }) => {
    const window = givenAWindowReadyFor(intention);
    const acceptance = window.prepareAcceptance(prepare(window));
    const pointage = requiredFixture(acceptance.gestes[0], 'pointage of the global command');

    const reconciled = acceptance.applyTo(window).afterReconciling(Entreprise.of('entreprise-a'), {
      ...window.snapshot(),
      evenements: [{ geste: pointage, etat: 'REFUSE', refus: { code: 'suivi-cloture', message: 'Le pointage est refusé.' } }],
    });

    expect(reconciled.refusal()).toEqual({
      contexte: { kind: 'COMMANDE_GLOBALE', intention },
      message: 'Le pointage est refusé.',
    });
  });

  it('should keep a refusal born in an earlier operator window silent', () => {
    const previousGesture = requiredFixture(
      pointagesOf(fenetre.afterDeciding('moule-1015', 'SECONDAIRE', identifyFixture, Date.parse('2026-09-05T09:00:00Z')).decision)[0],
      'previous pointage',
    );
    const journalWithPreviousRefusal: JournalDuPupitre = {
      ...structuredClone(vueFixture),
      evenements: [{ geste: previousGesture, etat: 'REFUSE', refus: { code: 'suivi-cloture', message: "L'élément a été clôturé." } }],
    };
    fenetre = givenAWindowOpenedOn(journalWithPreviousRefusal, 2);

    whenReconciling(journalWithPreviousRefusal);

    thenNoRefusalIsVisible();
  });

  it('should not restore an earlier batch context when its local acceptance completes after a newer intent', () => {
    const earlier = fenetre.afterDeciding('moule-1015', 'SECONDAIRE', identifyFixture, Date.parse('2026-09-05T09:00:00Z'));
    const acceptance = earlier.fenetre.prepareAcceptance(gesturesOf(earlier.decision));
    const newerIntent = earlier.fenetre.afterIntendingGesture();
    const acceptedAfterNewerIntent = acceptance.applyTo(newerIntent);
    const refusedGesture = requiredFixture(acceptance.gestes[0], 'earlier pointage');

    fenetre = acceptedAfterNewerIntent.afterReconciling(Entreprise.of('entreprise-a'), {
      ...structuredClone(vueFixture),
      evenements: [{ geste: refusedGesture, etat: 'REFUSE', refus: { code: 'suivi-cloture', message: "L'élément a été clôturé." } }],
    });

    expect(fenetre.refusal()).toBeUndefined();
  });

  it('should turn every personal activity off from the primary target, keeping its workstation', () => {
    const stop = whenDeciding('of-204', 'PRINCIPALE');

    thenPointageTypesAre(stop, ['FIN', 'FIN', 'FIN']);
    thenPointagesKeepTheirWorkstations(stop, [undefined, 'tour', 'fraiseuse']);
  });

  it('should open without a workstation when the operator holds none', () => {
    const sansPoste = givenAWindowWithoutWorkstation();

    const withoutWorkstation = whenDecidingWith(sansPoste, 'of-1015', 'PRINCIPALE');

    thenPointagesKeepTheirWorkstations(withoutWorkstation, [undefined]);
  });

  it('should open directly on the only workstation the operator holds', () => {
    const defaultWorkstation = whenDeciding('of-1015', 'PRINCIPALE');

    thenPointagesKeepTheirWorkstations(defaultWorkstation, ['tour']);
  });

  it('should request a choice when the operator holds several workstations, then open on the chosen one', () => {
    const multiposte = givenAMultiWorkstationWindow();

    const choice = whenDecidingWith(multiposte, 'of-1015', 'PRINCIPALE');
    const chosen = whenChoosingWith(multiposte, 'of-1015', 'PRINCIPALE', 'fraiseuse');

    thenWorkstationChoiceIsRequested(choice);
    thenPointageTypesAre(chosen, ['DEBUT']);
    thenPointagesKeepTheirWorkstations(chosen, ['fraiseuse']);
  });

  it('should expose the latest refusal born in this window when reconciling its company', () => {
    const gestures = givenAcceptedDecision(whenDeciding('moule-1015', 'SECONDAIRE'));
    const refused = givenTheDecisionWasRefused(gestures);

    whenReconciling(refused);

    thenLatestRefusalNamesTheElement();
  });

  it('should never expose the refusal of an ignored pointage', () => {
    const gestures = givenAcceptedDecision(whenDeciding('moule-1015', 'SECONDAIRE'));

    whenReconciling(givenTheGesturesWereRefusedWith(gestures, [POINTAGE_IGNORE, POINTAGE_IGNORE]));

    thenNoRefusalIsVisible();
  });

  it.each<[string, readonly MotifFixture[]]>([
    ['ignored then closed', [POINTAGE_IGNORE, SUIVI_CLOTURE]],
    ['closed then ignored', [SUIVI_CLOTURE, POINTAGE_IGNORE]],
  ])('should expose the closed element refusal of a lot whose other pointage was %s', (_order, codes) => {
    const gestures = givenAcceptedDecision(whenDeciding('moule-1015', 'SECONDAIRE'));

    whenReconciling(givenTheGesturesWereRefusedWith(gestures, codes));

    thenLatestRefusalNamesTheElement();
  });

  it('should stop exposing a refusal as soon as another intent starts', () => {
    const gestures = givenAcceptedDecision(whenDeciding('moule-1015', 'SECONDAIRE'));
    whenReconciling(givenTheDecisionWasRefused(gestures));

    whenDeciding('of-1015', 'PRINCIPALE');

    thenNoRefusalIsVisible();
  });

  it('should preserve an earlier window while recognizing a refusal reconciled before durable acceptance', () => {
    const previous = fenetre;
    const secondaire = fenetre.afterDeciding('moule-1015', 'SECONDAIRE', identifyFixture, Date.parse('2026-09-05T09:00:00Z'));
    const refused = givenTheDecisionWasRefused(gesturesOf(secondaire.decision).capture());

    const reconciled = secondaire.fenetre.afterReconciling(Entreprise.of('entreprise-a'), refused);

    expect(previous.refusal()).toBeUndefined();
    expect(reconciled.refusal()).toEqual({
      contexte: { kind: 'ELEMENT', numero: NumeroDElement.assigned('1015') },
      message: "L'élément a été clôturé.",
    });
  });

  it('should retain the designated operator and workstation qualifications frozen at opening through a referential reconciliation', () => {
    const opened = givenAMultiWorkstationWindow();
    const reconciled = opened.afterReconciling(Entreprise.of('entreprise-a'), {
      ...structuredClone(vueFixture),
      referentiel: {
        operateurs: [],
        suivis: structuredClone(requiredFixture(vueFixture.referentiel, 'referential').suivis),
        categories: [],
        dureeMaximaleDActiviteEnMs: dureeMaximaleFixtureEnMs,
      },
    });

    const chosen = whenChoosingWith(reconciled, 'of-1015', 'PRINCIPALE', 'fraiseuse');

    expect(opened.operateur).toMatchObject({ id: 'jean', identifiant: '049' });
    expect(reconciled.operateur).toMatchObject({ id: 'jean', identifiant: '049' });
    thenPointagesKeepTheirWorkstations(chosen, ['fraiseuse']);
  });

  it('should retain accepted and refused gestures already reconciled without adding pending duplicates', () => {
    const gestures = gesturesOf(whenDeciding('moule-1015', 'SECONDAIRE')).capture();
    const reconciled = {
      ...structuredClone(vueFixture),
      evenements: gestures.map((geste, index) =>
        index === 0 ? acceptedFixture(geste) : { geste, etat: 'REFUSE' as const, refus: { code: 'suivi-cloture', message: 'Clôturé.' } },
      ),
    };

    fenetre = fenetre.afterReconciling(Entreprise.of('entreprise-a'), reconciled).afterAccept(gestures);

    expect(fenetre.snapshot().evenements).toEqual(reconciled.evenements);
  });

  it('should retain the pointed element number when a refusal arrives after that element disappeared', () => {
    const capture = whenDeciding('moule-1015', 'SECONDAIRE');
    const gestures = givenAcceptedDecision(capture);
    const refused = givenTheDecisionWasRefusedAfterTheElementDisappeared(gestures, 'moule-1015');

    whenReconciling(refused);

    thenLatestRefusalNamesTheElement();
  });

  it('should ignore a journal reconciled for another company', () => {
    const before = givenTheCurrentSnapshot();

    whenReconcilingFor('entreprise-b', EMPTY_JOURNAL_DU_PUPITRE);

    thenSnapshotIs(before);
  });

  it('should reject an element absent from the local reference', () => {
    const missing = whenDecidingUnknownElement();

    thenElementIsRefused(missing);
  });

  it('should reject a workstation choice on an element activated meanwhile', () => {
    const activeChoice = whenChoosingActiveElement();

    thenActiveChoiceIsRefused(activeChoice);
  });

  it('should return an independent journal snapshot', () => {
    const snapshot = givenTheCurrentSnapshot();

    whenChangingTheSnapshot(snapshot);

    thenTheWindowKeepsItsJournal();
  });

  it('should preserve nested gesture and refusal data in a copied snapshot without a referential', () => {
    const journal = givenAJournalWithEveryEventState();
    whenReconciling(journal);
    const snapshot = givenTheCurrentSnapshot();

    whenChangingNestedEventData(snapshot);

    thenTheSnapshotStillEquals(journal);
  });

  it('should show a zero frozen duration for an activity created after the window opened', () => {
    const futureWindow = givenAWindowWithOnlyAFutureActivity();

    const futureView = whenReadingPointage(futureWindow);

    thenFutureActivityStartsAtZero(futureView);
  });

  it('should show an empty pointage view when the reconciled reference is empty', () => {
    whenReconciling(EMPTY_JOURNAL_DU_PUPITRE);

    thenPointageViewIsEmpty();
  });

  it.each([
    [
      ['OF', 'MOULE'],
      ['OF', 'MOULE', 'PIECE'],
    ],
    [
      ['MOULE', 'OF'],
      ['MOULE', 'OF', 'PIECE'],
    ],
    [[], ['MOULE', 'OF', 'PIECE']],
  ])('should order the zones as the reference orders the categories %j, unknown ones last by code', (categories, attendu) => {
    const element = (id: string, categorie: string) => ({
      id,
      nom: id,
      etat: 'EN_ATTENTE' as const,
      categorie,
      activites: [],
      evenements: [],
    });
    const journal: JournalDuPupitre = {
      ...EMPTY_JOURNAL_DU_PUPITRE,
      referentiel: {
        operateurs: [{ id: 'jean', nom: 'Dupont', prenom: 'Jean', identifiant: '049', postes: [] }],
        suivis: [element('piece-1', 'PIECE'), element('of-1', 'OF'), element('moule-1', 'MOULE')],
        categories,
        dureeMaximaleDActiviteEnMs: dureeMaximaleFixtureEnMs,
      },
    };

    const pointage = whenReadingPointage(givenAWindowOpenedOn(journal));

    expect(pointage.zones.map(zone => zone.categorie)).toEqual(attendu);
  });

  it('should mark an element non conforme when its activities only contain non conformity', () => {
    const onlyNcJournal: JournalDuPupitre = {
      ...EMPTY_JOURNAL_DU_PUPITRE,
      referentiel: {
        operateurs: [{ id: 'jean', nom: 'Dupont', prenom: 'Jean', identifiant: '049', postes: [] }],
        suivis: [
          {
            id: 'of-nc',
            nom: 'OF-NC',
            etat: 'EN_COURS',
            categorie: 'OF',
            activites: [
              {
                ouverture: 'activite-fixture-22',
                echeance: '2026-09-05T21:30:00.000Z',
                operateurId: 'jean',
                categorie: 'NON_CONFORMITE',
                depuis: '2026-09-05T08:30:00Z',
              },
            ],
            evenements: [],
          },
        ],
        categories: [],
        dureeMaximaleDActiviteEnMs: dureeMaximaleFixtureEnMs,
      },
    };
    const onlyNcWindow = givenAWindowOpenedOn(onlyNcJournal);

    const pointage = whenReadingPointage(onlyNcWindow);

    expect(elementsDeLaZone(pointage, 'OF')[0]?.isNonConforme()).toBe(true);
  });

  it('should sort elements using natural numeric order', () => {
    const unsortedJournal: JournalDuPupitre = {
      ...EMPTY_JOURNAL_DU_PUPITRE,
      referentiel: {
        operateurs: [{ id: 'jean', nom: 'Dupont', prenom: 'Jean', identifiant: '049', postes: [] }],
        suivis: [
          { id: 'of-10', nom: 'OF-10', etat: 'EN_ATTENTE', categorie: 'OF', activites: [], evenements: [] },
          { id: 'of-2', nom: 'OF-2', etat: 'EN_ATTENTE', categorie: 'OF', activites: [], evenements: [] },
          { id: 'of-1', nom: 'OF-1', etat: 'EN_ATTENTE', categorie: 'OF', activites: [], evenements: [] },
        ],
        categories: [],
        dureeMaximaleDActiviteEnMs: dureeMaximaleFixtureEnMs,
      },
    };
    const sortWindow = givenAWindowOpenedOn(unsortedJournal);

    const pointage = whenReadingPointage(sortWindow);

    expect(elementsDeLaZone(pointage, 'OF').map(element => element.numero.toString())).toEqual(['OF-1', 'OF-2', 'OF-10']);
  });

  it('should sort elements on their company reference rather than on their generated name', () => {
    const referencedJournal: JournalDuPupitre = {
      ...EMPTY_JOURNAL_DU_PUPITRE,
      referentiel: {
        operateurs: [{ id: 'jean', nom: 'Dupont', prenom: 'Jean', identifiant: '049', postes: [] }],
        suivis: [
          {
            id: 'of-1',
            nom: 'OF-1',
            reference: 'M-30',
            etat: 'EN_ATTENTE',
            categorie: 'OF',
            activites: [],
            evenements: [],
          },
          { id: 'of-2', nom: 'OF-2', etat: 'EN_ATTENTE', categorie: 'OF', activites: [], evenements: [] },
          {
            id: 'of-3',
            nom: 'OF-3',
            reference: 'M-4',
            etat: 'EN_ATTENTE',
            categorie: 'OF',
            activites: [],
            evenements: [],
          },
        ],
        categories: [],
        dureeMaximaleDActiviteEnMs: dureeMaximaleFixtureEnMs,
      },
    };
    const sortWindow = givenAWindowOpenedOn(referencedJournal);

    const pointage = whenReadingPointage(sortWindow);

    expect(elementsDeLaZone(pointage, 'OF').map(element => element.numero.toString())).toEqual(['M-4', 'M-30', 'OF-2']);
  });

  it('should capture an opening when confirming a workstation choice', () => {
    const multiposte = givenAMultiWorkstationWindow();

    const gestures = whenChoosingWith(multiposte, 'of-1015', 'PRINCIPALE', 'fraiseuse').capture();

    thenGesturesAre(gestures, ['POINTAGE']);
    expect(gestures[0]).toMatchObject({ nature: 'POINTAGE', type: 'DEBUT', posteId: 'fraiseuse' });
  });

  it('should expose no refusal after a workstation choice until one is reconciled', () => {
    const multiposte = givenAMultiWorkstationWindow();
    const choice = multiposte.afterChoosingPoste('of-1015', 'PRINCIPALE', 'fraiseuse', identifyFixture, Date.parse('2026-09-05T09:00:00Z'));

    const reconciled = choice.fenetre.afterReconciling(
      Entreprise.of('entreprise-a'),
      givenTheDecisionWasRefused(choice.decision.capture()),
    );

    expect(choice.fenetre.refusal()).toBeUndefined();
    expect(reconciled.refusal()).toEqual({
      contexte: { kind: 'ELEMENT', numero: NumeroDElement.generated('OF-2026-000042') },
      message: "L'élément a été clôturé.",
    });
  });

  it('should increment the intention counter monotonically across sequential decisions', () => {
    const first = gesturesOf(whenDeciding('moule-1015', 'PRINCIPALE'));
    const second = gesturesOf(whenDeciding('of-204', 'PRINCIPALE'));

    expect([first.intention, second.intention]).toEqual([1, 2]);
  });

  it.each([
    { intention: 'PAUSE' as const, permet: true },
    { intention: 'REPRENDRE' as const, permet: false },
    { intention: 'TOUT_ARRETER' as const, permet: true },
  ])('should offer $intention according to known personal activities', ({ intention, permet }) => {
    const commandes = whenReadingGlobalCommands(fenetre);

    thenGlobalCommandIsPermitted(commandes, intention, permet);
  });

  it('should disable PAUSE without a personal activity', () => {
    const idle = givenAWindowOf({});

    const commandes = whenReadingGlobalCommands(idle);

    thenGlobalCommandIsPermitted(commandes, 'PAUSE', false);
  });

  it('should offer REPRENDRE once a pause is taken', () => {
    const paused = givenAnAcceptedPause(givenAWindowOf({ 'moule-1015': [travailAuTourFixture] }));

    const commandes = whenReadingGlobalCommands(paused);

    thenGlobalCommandIsPermitted(commandes, 'REPRENDRE', true);
  });

  it('should show the local pause in progress', () => {
    const paused = givenAnAcceptedPause(givenAWindowOf({ 'moule-1015': [travailAuTourFixture] }));

    const commandes = whenReadingGlobalCommands(paused);

    thenSituationIs(commandes, true);
  });

  const whenReadingGlobalCommands = (window: FenetreOperateur): CommandesGlobales => window.commandesGlobales();
  const thenSituationIs = (commandes: CommandesGlobales, enPause: boolean): void => {
    expect(commandes.enPause()).toBe(enPause);
  };
  const thenGlobalCommandIsPermitted = (commandes: CommandesGlobales, intention: IntentionGlobaleDAtelier, permet: boolean): void => {
    expect(commandes.permet(intention)).toBe(permet);
  };

  const identifyFixture = (): IdentiteDuGeste => {
    const id = crypto.randomUUID();
    const dateDeSurvenue = new Date(Date.parse(dateDuGeste) + identities.size).toISOString();
    identities.set(id, dateDeSurvenue);
    return { id, dateDeSurvenue };
  };
  const gesturesOf = (decision: DecisionDePointage): LotDeGestesDAtelier => {
    if (decision.kind !== 'GESTES') throw new Error('Expected gestures fixture.');
    return decision;
  };
  const pointagesOf = (decision: DecisionDePointage): readonly GesteDePointage[] => gesturesOf(decision).capture();
  const givenAWindowOpenedOn = (journal: JournalDuPupitre, identity = 1): FenetreOperateur =>
    FenetreOperateur.open(
      Entreprise.of('entreprise-a'),
      journal,
      identifiantFixture('049'),
      Date.parse('2026-09-05T09:00:00Z'),
      new IdentiteDeFenetre(identity),
    );
  const givenAWindowOf = (activitesParSuivi: Readonly<Record<string, readonly ActiviteDuPupitre[]>>): FenetreOperateur => {
    const referentiel = requiredFixture(vueFixture.referentiel, 'referential');
    return givenAWindowOpenedOn({
      ...EMPTY_JOURNAL_DU_PUPITRE,
      referentiel: {
        operateurs: referentiel.operateurs,
        suivis: referentiel.suivis.map(suivi => ({ ...suivi, activites: activitesParSuivi[suivi.id] ?? [] })),
        categories: [],
        dureeMaximaleDActiviteEnMs: dureeMaximaleFixtureEnMs,
      },
    });
  };
  const givenAnAcceptedDecision = (window: FenetreOperateur, suiviId: string, cible: 'PRINCIPALE' | 'SECONDAIRE'): FenetreOperateur => {
    const decision = window.afterDeciding(suiviId, cible, identifyFixture, Date.parse('2026-09-05T09:00:00Z'));
    return decision.fenetre.prepareAcceptance(gesturesOf(decision.decision)).applyTo(decision.fenetre);
  };
  const givenAWindowReadyFor = (intention: 'PAUSE' | 'REPRENDRE'): FenetreOperateur => {
    const working = givenAWindowWithActivities({ 'moule-1015': [travailAuTourFixture] });
    return intention === 'PAUSE' ? working : givenAnAcceptedPause(working);
  };
  const givenAnAcceptedPause = (window: FenetreOperateur): FenetreOperateur => {
    const pause = window.prepareAcceptance(window.preparePause(identifyFixture, 'pause-de-midi'));
    return pause.applyTo(window);
  };
  const givenAWindowWithActivities = (activitesParSuivi: Readonly<Record<string, readonly ActiviteDuPupitre[]>>): FenetreOperateur =>
    givenAWindowOf(activitesParSuivi);
  const givenAnAcceptedStopWithoutActivities = (): FenetreOperateur => {
    const inactiveJournalFixture: JournalDuPupitre = {
      ...EMPTY_JOURNAL_DU_PUPITRE,
      referentiel: {
        operateurs: [{ id: 'jean', nom: 'Dupont', prenom: 'Jean', identifiant: '049', postes: [] }],
        suivis: [{ id: 'of-1', nom: 'OF-1', etat: 'EN_ATTENTE', categorie: 'OF', activites: [], evenements: [] }],
        categories: [],
        dureeMaximaleDActiviteEnMs: dureeMaximaleFixtureEnMs,
      },
    };
    const initialWindow = givenAWindowOpenedOn(inactiveJournalFixture);
    const stop = initialWindow.prepareAcceptance(initialWindow.prepareToutArreter(identifyFixture));
    return stop.applyTo(initialWindow);
  };
  const whenStartingAnActivityIn = (window: FenetreOperateur): readonly GesteDePointage[] => {
    const start = window.afterDeciding('of-1', 'PRINCIPALE', identifyFixture, Date.parse('2026-09-05T09:00:00Z'));
    return start.fenetre.prepareAcceptance(gesturesOf(start.decision)).gestes;
  };
  const thenTheFirstGestureIsAnOpening = (gestes: readonly GesteDePointage[]): void => {
    expect(gestes).toMatchObject([{ nature: 'POINTAGE', type: 'DEBUT' }]);
  };
  const givenAPreparedPointage = (): (() => readonly GesteDePointage[]) => {
    const result = fenetre.afterDeciding('of-1015', 'PRINCIPALE', identifyFixture, Date.parse('2026-09-05T09:00:00Z'));
    fenetre = result.fenetre;
    const decision = gesturesOf(result.decision);
    return () => fenetre.capture(decision);
  };
  const givenTheRecordedIdentities = (): Map<string, string> => new Map(identities);
  const whenAnHourPasses = (): void => {
    dateDuGeste = '2026-09-05T09:00:00Z';
  };
  const whenResolvingTheOperator = (): FenetreOperateur['operateur'] =>
    FenetreOperateur.open(
      Entreprise.of('entreprise-a'),
      structuredClone(vueFixture),
      identifiantFixture('049'),
      Date.parse('2026-09-05T09:00:00Z'),
      new IdentiteDeFenetre(1),
    ).operateur;
  const whenReadingThePointageView = (): ReturnType<FenetreOperateur['pointage']> => fenetre.pointage();
  const givenTheCurrentSnapshot = (): JournalDuPupitre => fenetre.snapshot();
  const whenChangingTheSnapshot = (snapshot: JournalDuPupitre): void => {
    Object.assign(snapshot, { connecte: false });
    Object.assign(snapshot.evenements, { length: 0 });
    Object.assign(requiredFixture(snapshot.referentiel, 'referential').operateurs, { length: 0 });
  };
  const givenAJournalWithEveryEventState = (): JournalDuPupitre => {
    const geste = {
      nature: 'POINTAGE' as const,
      type: 'DEBUT' as const,
      suiviId: 'piece',
      operateurId: 'jean',
      id: 'debut',
      dateDeSurvenue: '2026-09-05T08:00:00Z',
    };
    return {
      connecte: true,
      evenements: [
        { geste, etat: 'EN_ATTENTE' },
        { geste, etat: 'ACCEPTE' },
        { geste, etat: 'REFUSE', refus: { code: 'refuse', message: 'refuse' } },
      ],
    };
  };
  const whenChangingNestedEventData = (snapshot: JournalDuPupitre): void => {
    const refusal = snapshot.evenements.find(event => event.etat === 'REFUSE');
    if (refusal === undefined) throw new Error('Missing refused event fixture.');
    Object.assign(refusal.geste, { id: 'changed' });
    Object.assign(refusal.refus, { message: 'changed' });
  };
  const whenChangingSnapshotSuspension = (snapshot: JournalDuPupitre, index: number, change: Partial<Suspension>): void => {
    const geste = requiredFixture(snapshot.evenements[index], 'suspended gesture').geste;
    Object.assign(requiredFixture(geste.suspension, 'suspension'), change);
  };
  const whenReadingPointage = (window: FenetreOperateur): ReturnType<FenetreOperateur['pointage']> => window.pointage();
  const givenAMultiWorkstationWindow = (): FenetreOperateur => {
    const referentiel = requiredFixture(vueFixture.referentiel, 'referential');
    const operateur = requiredFixture(referentiel.operateurs[0], 'operator');
    return FenetreOperateur.open(
      Entreprise.of('entreprise-a'),
      {
        ...vueFixture,
        referentiel: {
          ...referentiel,
          operateurs: [{ ...operateur, postes: [...operateur.postes, { id: 'fraiseuse', libelle: 'Fraiseuse' }] }],
        },
      },
      identifiantFixture('049'),
      Date.parse('2026-09-05T09:00:00Z'),
      new IdentiteDeFenetre(2),
    );
  };
  const givenAWindowWithoutWorkstation = (): FenetreOperateur => {
    const referentiel = requiredFixture(vueFixture.referentiel, 'referential');
    const operateur = requiredFixture(referentiel.operateurs[0], 'operator');
    return FenetreOperateur.open(
      Entreprise.of('entreprise-a'),
      { ...vueFixture, referentiel: { ...referentiel, operateurs: [{ ...operateur, postes: [] }] } },
      identifiantFixture('049'),
      Date.parse('2026-09-05T09:00:00Z'),
      new IdentiteDeFenetre(3),
    );
  };
  const whenDeciding = (suiviId: string, cible: 'PRINCIPALE' | 'SECONDAIRE'): DecisionDePointage => {
    const result = fenetre.afterDeciding(suiviId, cible, identifyFixture, Date.parse('2026-09-05T09:00:00Z'));
    fenetre = result.fenetre;
    return result.decision;
  };
  const whenDecidingWith = (owner: FenetreOperateur, suiviId: string, cible: 'PRINCIPALE' | 'SECONDAIRE'): DecisionDePointage =>
    owner.afterDeciding(suiviId, cible, identifyFixture, Date.parse('2026-09-05T09:00:00Z')).decision;
  const whenChoosingWith = (
    owner: FenetreOperateur,
    suiviId: string,
    cible: 'PRINCIPALE' | 'SECONDAIRE',
    posteId: string,
  ): LotDeGestesDAtelier => owner.afterChoosingPoste(suiviId, cible, posteId, identifyFixture, Date.parse('2026-09-05T09:00:00Z')).decision;
  const givenAcceptedDecision = (decision: DecisionDePointage): readonly GesteDePointage[] => {
    if (decision.kind !== 'GESTES') throw new Error('Expected gestures fixture.');
    const gestures = decision.capture();
    fenetre = fenetre.afterAccept(gestures);
    return gestures;
  };
  const givenTheDecisionWasRefused = (gestures: readonly GesteDePointage[]): JournalDuPupitre => ({
    ...structuredClone(vueFixture),
    evenements: gestures.map(geste => ({
      geste,
      etat: 'REFUSE',
      refus: { code: 'suivi-cloture', message: "L'élément a été clôturé." },
    })),
  });
  const messageOf = (motif: MotifFixture): { code: string; message: string; motif: MotifFixture } => ({
    code: 'code-de-diagnostic',
    motif,
    message: motif === POINTAGE_IGNORE ? 'Le pointage est ignoré.' : "L'élément a été clôturé.",
  });
  const givenTheGesturesWereRefusedWith = (gestures: readonly GesteDePointage[], codes: readonly MotifFixture[]): JournalDuPupitre => ({
    ...structuredClone(vueFixture),
    evenements: gestures.map((geste, index) => ({
      geste,
      etat: 'REFUSE',
      refus: messageOf(requiredFixture(codes[index], 'refusal code')),
    })),
  });
  const givenTheDecisionWasRefusedAfterTheElementDisappeared = (
    gestures: readonly GesteDePointage[],
    suiviId: string,
  ): JournalDuPupitre => {
    const refused = givenTheDecisionWasRefused(gestures);
    const referentiel = requiredFixture(refused.referentiel, 'referential');
    return { ...refused, referentiel: { ...referentiel, suivis: referentiel.suivis.filter(suivi => suivi.id !== suiviId) } };
  };
  const whenReconciling = (vue: JournalDuPupitre): void => {
    fenetre = fenetre.afterReconciling(Entreprise.of('entreprise-a'), vue);
  };
  const whenReconcilingFor = (entreprise: string, vue: JournalDuPupitre): void => {
    fenetre = fenetre.afterReconciling(Entreprise.of(entreprise), vue);
  };
  const whenDecidingUnknownElement = (): unknown => {
    try {
      return fenetre.afterDeciding('inconnu', 'PRINCIPALE', identifyFixture, Date.parse('2026-09-05T09:00:00Z'));
    } catch (failure: unknown) {
      return failure;
    }
  };
  const whenChoosingActiveElement = (): unknown => {
    try {
      return fenetre.afterChoosingPoste('moule-1015', 'PRINCIPALE', 'tour', identifyFixture, Date.parse('2026-09-05T09:00:00Z'));
    } catch (failure: unknown) {
      return failure;
    }
  };
  const givenAWindowWithOnlyAFutureActivity = (): FenetreOperateur => {
    const referentiel = requiredFixture(vueFixture.referentiel, 'referential');
    const suivi = requiredFixture(
      referentiel.suivis.find(candidate => candidate.id === 'moule-1015'),
      'moule',
    );
    return FenetreOperateur.open(
      Entreprise.of('entreprise-a'),
      {
        ...vueFixture,
        referentiel: {
          ...referentiel,
          suivis: [
            {
              ...suivi,
              activites: [
                {
                  ouverture: 'activite-fixture-29',
                  echeance: '2026-09-05T23:00:00.000Z',
                  operateurId: 'jean',
                  categorie: 'TRAVAIL',
                  depuis: '2026-09-05T10:00:00Z',
                  posteId: 'tour',
                },
              ],
            },
          ],
        },
      },
      identifiantFixture('049'),
      Date.parse('2026-09-05T09:00:00Z'),
      new IdentiteDeFenetre(4),
    );
  };
  const whenOpeningAnUnknownOperator = (vue: JournalDuPupitre): unknown => {
    try {
      return FenetreOperateur.open(
        Entreprise.of('entreprise-a'),
        vue,
        identifiantFixture('inconnu'),
        Date.parse('2026-09-05T09:00:00Z'),
        new IdentiteDeFenetre(5),
      );
    } catch (failure: unknown) {
      return failure;
    }
  };
  const whenPointingAtAnUnauthorizedWorkstation = (): unknown => {
    try {
      return givenAMultiWorkstationWindow().afterChoosingPoste(
        'of-1015',
        'PRINCIPALE',
        'interdit',
        identifyFixture,
        Date.parse('2026-09-05T09:00:00Z'),
      );
    } catch (failure: unknown) {
      return failure;
    }
  };
  const whenCapturingPointage = (capture: () => readonly GesteDePointage[]): readonly GesteDePointage[] => capture();
  const whenAcceptingPointage = (capture: () => readonly GesteDePointage[]): readonly GesteDePointage[] => {
    const gestes = capture();
    fenetre = fenetre.afterAccept(gestes);
    return gestes;
  };
  const thenOperatorIsJean = (id: string): void => {
    expect(id).toBe('jean');
  };
  const thenPointageViewIsPersonalAndFrozen = (pointage: ReturnType<FenetreOperateur['pointage']>): void => {
    expect(
      elementsDeLaZone(pointage, 'MOULE').map(element => ({
        id: element.id,
        numero: element.numero.toString(),
        dureeMs: element.dureeMs(),
      })),
    ).toEqual([{ id: 'moule-1015', numero: '1015', dureeMs: 10_800_000 }]);
    expect(elementsDeLaZone(pointage, 'MOULE')[0]?.isNonConforme()).toBe(false);
    expect(elementsDeLaZone(pointage, 'MOULE')[0]?.numero.isRepliSurNom()).toBe(false);
    expect(elementsDeLaZone(pointage, 'OF').map(element => element.numero.toString())).toEqual(['204', 'OF-2026-000042']);
    expect(elementsDeLaZone(pointage, 'OF')[0]?.isNonConforme()).toBe(true);
    expect(elementsDeLaZone(pointage, 'OF')[0]?.numero.isRepliSurNom()).toBe(false);
    expect(elementsDeLaZone(pointage, 'OF')[0]?.dureeMs()).toBe(1_800_000);
    expect(elementsDeLaZone(pointage, 'OF')[1]?.numero.isRepliSurNom()).toBe(true);
    expect(elementsDeLaZone(pointage, 'OF')[1]?.isActive()).toBe(false);
    expect(elementsDeLaZone(pointage, 'OF')[1]?.isNonConforme()).toBe(false);
    expect(elementsDeLaZone(pointage, 'OF')[1]?.dureeMs()).toBe(0);
  };
  const thenPointageTypesAre = (decision: DecisionDePointage, types: string[]): void => {
    expect(pointagesOf(decision).map(geste => geste.type)).toEqual(types);
  };
  const captureGestures = (decision: DecisionDePointage): readonly GesteDePointage[] => fenetre.capture(gesturesOf(decision));
  const thenTypesAndWorkstationsAre = (
    decision: DecisionDePointage,
    expected: readonly (readonly [string, string | undefined])[],
  ): void => {
    expect(pointagesOf(decision).map(geste => [geste.type, geste.posteId])).toEqual(expected);
  };
  const thenPointagesKeepTheirWorkstations = (decision: DecisionDePointage, postes: (string | undefined)[]): void => {
    expect(pointagesOf(decision).map(geste => geste.posteId)).toEqual(postes);
  };
  const thenWorkstationChoiceIsRequested = (decision: DecisionDePointage): void => {
    expect(decision).toMatchObject({
      kind: 'CHOIX_POSTE_REQUIS',
      numero: NumeroDElement.generated('OF-2026-000042'),
      postes: [
        { id: 'tour', libelle: 'Tour' },
        { id: 'fraiseuse', libelle: 'Fraiseuse' },
      ],
    });
  };
  const thenLatestRefusalNamesTheElement = (): void => {
    expect(fenetre.refusal()).toEqual({
      contexte: { kind: 'ELEMENT', numero: NumeroDElement.assigned('1015') },
      message: "L'élément a été clôturé.",
    });
  };
  const thenNoRefusalIsVisible = (): void => {
    expect(fenetre.refusal()).toBeUndefined();
  };
  const thenSnapshotIs = (expected: JournalDuPupitre): void => {
    expect(fenetre.snapshot()).toEqual(expected);
  };
  const thenTheWindowKeepsItsJournal = (): void => {
    expect(fenetre.snapshot()).toEqual(vueFixture);
  };
  const thenTheSnapshotStillEquals = (expected: JournalDuPupitre): void => {
    expect(fenetre.snapshot()).toEqual(expected);
  };
  const thenElementIsRefused = (failure: unknown): void => {
    expect(failure).toBeInstanceOf(Error);
    expect(failure).toHaveProperty('message', expect.stringContaining('absent'));
  };
  const thenActiveChoiceIsRefused = (failure: unknown): void => {
    expect(failure).toBeInstanceOf(Error);
    expect(failure).toHaveProperty('message', expect.stringContaining('déjà actif'));
  };
  const thenFutureActivityStartsAtZero = (pointage: ReturnType<FenetreOperateur['pointage']>): void => {
    expect(elementsDeLaZone(pointage, 'MOULE')[0]?.dureeMs()).toBe(0);
  };
  const thenPointageViewIsEmpty = (): void => {
    expect(fenetre.pointage()).toEqual({ zones: [] });
  };
  const thenWindowIsRefused = (refusal: unknown): void => {
    expect(refusal).toBeInstanceOf(Error);
    expect(refusal).toHaveProperty('message', expect.stringContaining('Identifiant absent'));
  };
  const thenWorkstationIsRefused = (refusal: unknown): void => {
    expect(refusal).toBeInstanceOf(Error);
    expect(refusal).toHaveProperty('message', expect.stringContaining('habilitations'));
  };
  const thenGesturesAre = (gestes: readonly GesteDePointage[], natures: string[]): void => {
    expect(gestes.map(geste => geste.nature)).toEqual(natures);
    expect(gestes.every(geste => geste.operateurId === 'jean')).toBe(true);
  };
  const thenPointagesAre = (gestes: readonly GesteDePointage[], expected: readonly unknown[]): void => {
    expect(gestes.map(({ suiviId, type, posteId, suspension }) => ({ suiviId, type, posteId, suspension }))).toEqual(expected);
  };
  const thenOpeningSharesBusinessTime = (gestes: readonly GesteDePointage[]): void => {
    const lastGesture = requiredFixture(gestes.at(-1), 'last gesture');
    expect(gestes.map(geste => geste.dateDeSurvenue)).toEqual(
      Array<string | undefined>(gestes.length).fill(identities.get(lastGesture.id)),
    );
  };
  const thenIdentitiesWerePreparedBeforeExecution = (gestes: readonly GesteDePointage[], preparedIdentities: Map<string, string>): void => {
    expect(new Set(gestes.map(geste => geste.id)).size).toBe(gestes.length);
    expect(gestes.every(geste => preparedIdentities.has(geste.id))).toBe(true);
    expect(gestes.every(geste => geste.dateDeSurvenue === preparedIdentities.get(geste.id))).toBe(true);
  };
});

const identifiantFixture = (saisie: string): Identifiant =>
  Array.from(saisie).reduce((identifiant, caractere) => identifiant.afterDigit(caractere), Identifiant.empty());
