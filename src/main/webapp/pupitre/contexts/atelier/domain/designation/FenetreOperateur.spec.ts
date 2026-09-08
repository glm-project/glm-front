import { IdentiteDeFenetre } from '@/pupitre/contexts/atelier/domain/designation/IdentiteDeFenetre';
import { EMPTY_JOURNAL_DU_PUPITRE, GesteDAtelier, IdentiteDuGeste, JournalDuPupitre } from '../journal-du-pupitre/JournalDuPupitre';
import { DecisionDePointage, FenetreOperateur, LotDeGestesDAtelier } from './FenetreOperateur';
import { IntentionGlobaleInitiee } from './IntentionGlobaleInitiee';

const isMissingFixture = (value: unknown): value is null | undefined => value === null || value === undefined;

const requiredFixture = <T>(value: T | null | undefined, description: string): T => {
  if (isMissingFixture(value)) {
    throw new Error(`Missing ${description} fixture.`);
  }
  return value;
};

const acceptedFixture = (geste: GesteDAtelier): JournalDuPupitre['evenements'][number] =>
  geste.nature === 'ARRIVEE' ? { geste, etat: 'ACCEPTE', journeeOuverte: false } : { geste, etat: 'ACCEPTE' };

const vueFixture: JournalDuPupitre = {
  ...EMPTY_JOURNAL_DU_PUPITRE,
  referentiel: {
    operateurs: [{ id: 'jean', nom: 'Dupont', prenom: 'Jean', matricule: '049', postes: [{ id: 'tour', libelle: 'Tour' }] }],
    suivis: [
      {
        id: 'moule-1015',
        nom: 'PR-2026-000015',
        reference: '1015',
        etat: 'EN_COURS',
        type: 'PRODUIT',
        activites: [
          { operateurId: 'jean', categorie: 'TRAVAIL', depuis: '2026-09-05T06:00:00Z', posteId: 'tour' },
          { operateurId: 'marc', categorie: 'NON_CONFORMITE', depuis: '2026-09-05T05:00:00Z' },
        ],
        evenements: [],
      },
      {
        id: 'of-204',
        nom: 'OF-2026-000204',
        reference: '204',
        etat: 'EN_COURS',
        type: 'ORDRE_DE_FABRICATION',
        activites: [
          { operateurId: 'jean', categorie: 'NON_CONFORMITE', depuis: '2026-09-05T08:30:00Z' },
          { operateurId: 'jean', categorie: 'TRAVAIL', depuis: '2026-09-05T09:30:00Z', posteId: 'tour' },
          { operateurId: 'jean', categorie: 'NON_CONFORMITE', depuis: '2026-09-05T08:45:00Z' },
        ],
        evenements: [],
      },
      {
        id: 'of-1015',
        nom: 'OF-2026-000042',
        etat: 'EN_ATTENTE',
        type: 'ORDRE_DE_FABRICATION',
        activites: [],
        evenements: [],
      },
    ],
  },
};

describe('FenetreOperateur', () => {
  let fenetre: FenetreOperateur;
  let dateDuGeste: string;
  let identities: Map<string, string>;

  beforeEach(() => {
    fenetre = FenetreOperateur.open(
      'entreprise-a',
      structuredClone(vueFixture),
      '049',
      Date.parse('2026-09-05T09:00:00Z'),
      new IdentiteDeFenetre(1),
    );
    dateDuGeste = '2026-09-05T08:00:00Z';
    identities = new Map<string, string>();
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

    expect(() => pending.afterDeciding('moule-1015', 'PRINCIPALE', identifyFixture)).toThrow('Une commande globale est en cours.');
    expect(() => pending.afterChoosingPoste('of-1015', 'PRINCIPALE', 'tour', identifyFixture)).toThrow(
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

  it('should decide the implicit arrival when executing each capture while retaining identities from the operator action', () => {
    const first = givenAPreparedPointage();
    const second = givenAPreparedPointage();
    const preparedIdentities = givenTheRecordedIdentities();

    whenAnHourPasses();
    const firstGestures = whenAcceptingPointage(first);
    const secondGestures = whenCapturingPointage(second);

    thenGesturesAre(firstGestures, ['ARRIVEE', 'PRESENCE', 'POINTAGE']);
    thenGesturesAre(secondGestures, ['PRESENCE', 'POINTAGE']);
    thenIdentitiesWerePreparedBeforeExecution([...firstGestures, ...secondGestures], preparedIdentities);
    thenOpeningSharesBusinessTime(firstGestures);
  });

  it('should keep requiring arrival until a business command has been committed', () => {
    const first = givenAPreparedPointage();
    const retry = givenAPreparedPointage();

    whenCapturingPointage(first);
    const presence = whenAcceptingAnExplicitPause();
    const retriedGestures = whenCapturingPointage(retry);

    thenGesturesAre(retriedGestures, ['PRESENCE', 'POINTAGE']);
    thenAcceptedPresenceIsVisible(presence);
  });

  it('should assure arrival before the first explicit pause', () => {
    const pause = fenetre.preparePresence('PAUSE', identifyFixture);

    const gestes = pause.capture();

    thenGesturesAre(gestes, ['ARRIVEE', 'PRESENCE']);
    expect(gestes[1]).toMatchObject({ nature: 'PRESENCE', type: 'PAUSE', implicite: false });
  });

  it('should correlate the first explicit resumption with its arrival assurance', () => {
    const reprise = fenetre.preparePresence('REPRISE', identifyFixture);

    const gestes = fenetre.capture(reprise);

    thenGesturesAre(gestes, ['ARRIVEE', 'PRESENCE']);
    expect(gestes[1]).toMatchObject({
      nature: 'PRESENCE',
      type: 'REPRISE',
      implicite: false,
      assuranceArriveeId: gestes[0]?.id,
    });
  });

  it('should assure arrival without an implicit resumption before a first finish', () => {
    const fin = whenDeciding('moule-1015', 'PRINCIPALE');

    const gestes = captureGestures(fin);

    thenGesturesAre(gestes, ['ARRIVEE', 'POINTAGE']);
    thenPointageTypesAre(fin, ['FIN']);
  });

  it('should not resume implicitly when moving work to non conformity', () => {
    const nonConformite = whenDeciding('moule-1015', 'SECONDAIRE');

    const gestes = captureGestures(nonConformite);

    thenGesturesAre(gestes, ['ARRIVEE', 'POINTAGE']);
    thenPointageTypesAre(nonConformite, ['NON_CONFORMITE']);
  });

  it('should resume implicitly when moving non conformity back to work', () => {
    const travail = whenDeciding('of-204', 'SECONDAIRE');

    const gestes = captureGestures(travail);

    thenGesturesAre(gestes, ['ARRIVEE', 'PRESENCE', 'POINTAGE', 'POINTAGE']);
    thenPointageTypesAre(travail, ['DEBUT', 'DEBUT']);
  });

  it('should resume implicitly when opening an activity after an accepted pause', () => {
    whenAcceptingAnExplicitPause();

    const ouverture = whenDeciding('of-1015', 'PRINCIPALE');
    const gestes = captureGestures(ouverture);

    thenGesturesAre(gestes, ['PRESENCE', 'POINTAGE']);
    expect(gestes[0]).toMatchObject({ nature: 'PRESENCE', type: 'REPRISE', implicite: true });
  });

  it('should finish every personal activity with its workstation before departure when stopping all', () => {
    const toutArreter = fenetre.prepareToutArreter(identifyFixture);

    const gestes = toutArreter.capture();

    thenGesturesAre(gestes, ['ARRIVEE', 'POINTAGE', 'POINTAGE', 'POINTAGE', 'POINTAGE', 'PRESENCE']);
    expect(
      gestes
        .filter(geste => geste.nature === 'POINTAGE')
        .map(geste => ({ suiviId: geste.suiviId, type: geste.type, posteId: geste.posteId })),
    ).toEqual([
      { suiviId: 'moule-1015', type: 'FIN', posteId: 'tour' },
      { suiviId: 'of-204', type: 'FIN', posteId: undefined },
      { suiviId: 'of-204', type: 'FIN', posteId: 'tour' },
      { suiviId: 'of-204', type: 'FIN', posteId: undefined },
    ]);
    expect(gestes.at(-1)).toMatchObject({ nature: 'PRESENCE', type: 'DEPART', implicite: false });
    expect(new Set(gestes.map(geste => geste.id)).size).toBe(gestes.length);
    expect(new Set(gestes.map(geste => geste.dateDeSurvenue))).toEqual(new Set(['2026-09-05T08:00:00.000Z']));
  });

  it('should not repeat arrival before stopping all after a first accepted command', () => {
    const premiereCommande = fenetre.capture(fenetre.preparePresence('PAUSE', identifyFixture));
    fenetre = fenetre.afterAccept(premiereCommande);

    const toutArreter = fenetre.capture(fenetre.prepareToutArreter(identifyFixture));

    thenGesturesAre(toutArreter, ['POINTAGE', 'POINTAGE', 'POINTAGE', 'POINTAGE', 'PRESENCE']);
  });

  it('should assure arrival then depart when stopping all without a visible activity', () => {
    fenetre = fenetre.afterReconciling('entreprise-a', EMPTY_JOURNAL_DU_PUPITRE);

    const toutArreter = fenetre.prepareToutArreter(identifyFixture).capture();

    thenGesturesAre(toutArreter, ['ARRIVEE', 'PRESENCE']);
    expect(toutArreter.at(-1)).toMatchObject({ nature: 'PRESENCE', type: 'DEPART' });
  });

  it('should expose a refused finish from the current global stop batch as TOUT ARRÊTER', () => {
    const decision = fenetre.prepareToutArreter(identifyFixture);
    const acceptance = fenetre.prepareAcceptance(decision);
    const gestes = acceptance.gestes;
    fenetre = acceptance.applyTo(fenetre);
    const fin = requiredFixture(
      gestes.find(geste => geste.nature === 'POINTAGE' && geste.type === 'FIN'),
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

  it('should expose only a refused departure when it is the latest refusal from the current global stop batch', () => {
    const decision = fenetre.prepareToutArreter(identifyFixture);
    const acceptance = fenetre.prepareAcceptance(decision);
    const fin = requiredFixture(
      acceptance.gestes.find(geste => geste.nature === 'POINTAGE' && geste.type === 'FIN'),
      'finish gesture',
    );
    const depart = requiredFixture(
      acceptance.gestes.find(geste => geste.nature === 'PRESENCE' && geste.type === 'DEPART'),
      'departure gesture',
    );
    fenetre = acceptance.applyTo(fenetre);

    whenReconciling({
      ...structuredClone(vueFixture),
      evenements: [
        { geste: fin, etat: 'REFUSE', refus: { code: 'suivi-cloture', message: "L'élément a été clôturé." } },
        { geste: depart, etat: 'REFUSE', refus: { code: 'presence-interdite', message: 'Le départ est refusé.' } },
      ],
    });

    expect(fenetre.refusal()).toEqual({
      contexte: { kind: 'COMMANDE_GLOBALE', intention: 'TOUT_ARRETER' },
      message: 'Le départ est refusé.',
    });
  });

  it.each([
    { presence: 'PAUSE' as const, intention: 'PAUSE' as const },
    { presence: 'REPRISE' as const, intention: 'REPRENDRE' as const },
  ])('should expose a refused $presence with its originating global command', ({ presence, intention }) => {
    const acceptance = fenetre.prepareAcceptance(fenetre.preparePresence(presence, identifyFixture));
    const geste = requiredFixture(
      acceptance.gestes.find(candidate => candidate.nature === 'PRESENCE'),
      'presence gesture',
    );
    fenetre = acceptance.applyTo(fenetre);

    whenReconciling({
      ...structuredClone(vueFixture),
      evenements: [{ geste, etat: 'REFUSE', refus: { code: 'presence-interdite', message: 'La présence est refusée.' } }],
    });

    expect(fenetre.refusal()).toEqual({
      contexte: { kind: 'COMMANDE_GLOBALE', intention },
      message: 'La présence est refusée.',
    });
  });

  it('should keep a refusal born in an earlier operator window silent', () => {
    const previousDecision = fenetre.afterDeciding('moule-1015', 'SECONDAIRE', identifyFixture).decision;
    if (previousDecision.kind !== 'GESTES') throw new Error('Expected gestures fixture.');
    const previousGesture = requiredFixture(
      previousDecision.capture().find(geste => geste.nature === 'POINTAGE'),
      'previous pointage',
    );
    const journalWithPreviousRefusal: JournalDuPupitre = {
      ...structuredClone(vueFixture),
      evenements: [{ geste: previousGesture, etat: 'REFUSE', refus: { code: 'suivi-cloture', message: "L'élément a été clôturé." } }],
    };
    fenetre = FenetreOperateur.open(
      'entreprise-a',
      journalWithPreviousRefusal,
      '049',
      Date.parse('2026-09-05T09:00:00Z'),
      new IdentiteDeFenetre(2),
    );

    whenReconciling(journalWithPreviousRefusal);

    expect(fenetre.refusal()).toBeUndefined();
  });

  it('should not restore an earlier batch context when its local acceptance completes after a newer intent', () => {
    const earlier = fenetre.afterDeciding('moule-1015', 'SECONDAIRE', identifyFixture);
    if (earlier.decision.kind !== 'GESTES') throw new Error('Expected gestures fixture.');
    const acceptance = earlier.fenetre.prepareAcceptance(earlier.decision);
    const newerIntent = earlier.fenetre.afterIntendingGesture();
    const acceptedAfterNewerIntent = acceptance.applyTo(newerIntent);
    const refusedGesture = requiredFixture(
      acceptance.gestes.find(geste => geste.nature === 'POINTAGE'),
      'earlier pointage',
    );

    fenetre = acceptedAfterNewerIntent.afterReconciling('entreprise-a', {
      ...structuredClone(vueFixture),
      evenements: [{ geste: refusedGesture, etat: 'REFUSE', refus: { code: 'suivi-cloture', message: "L'élément a été clôturé." } }],
    });

    expect(fenetre.refusal()).toBeUndefined();
  });

  it('should not repeat arrival after the first business command was accepted', () => {
    const premiereCommande = fenetre.capture(fenetre.preparePresence('PAUSE', identifyFixture));
    fenetre = fenetre.afterAccept(premiereCommande);

    const commandeSuivante = fenetre.capture(fenetre.preparePresence('REPRISE', identifyFixture));

    thenGesturesAre(commandeSuivante, ['PRESENCE']);
    expect(commandeSuivante[0]).toMatchObject({ nature: 'PRESENCE', type: 'REPRISE', implicite: false });
    expect(commandeSuivante[0]).not.toHaveProperty('assuranceArriveeId');
  });

  it('should turn every personal activity off from the primary target and normalize only necessary secondary transitions', () => {
    const stop = whenDeciding('of-204', 'PRINCIPALE');
    const backToWork = whenDeciding('of-204', 'SECONDAIRE');
    const toNonConformity = whenDeciding('moule-1015', 'SECONDAIRE');

    thenPointageTypesAre(stop, ['FIN', 'FIN', 'FIN']);
    thenPointageTypesAre(backToWork, ['DEBUT', 'DEBUT']);
    thenPointageTypesAre(toNonConformity, ['NON_CONFORMITE']);
    thenPointagesKeepTheirWorkstations(stop, [undefined, 'tour', undefined]);
  });

  it('should open directly with zero or one workstation and request a choice with several', () => {
    const sansPoste = givenAWindowWithoutWorkstation();
    const multiposte = givenAMultiWorkstationWindow();

    const withoutWorkstation = whenDecidingWith(sansPoste, 'of-1015', 'PRINCIPALE');
    const defaultWorkstation = whenDeciding('of-1015', 'PRINCIPALE');
    const choice = whenDecidingWith(multiposte, 'of-1015', 'PRINCIPALE');
    const chosen = whenChoosingWith(multiposte, 'of-1015', 'PRINCIPALE', 'fraiseuse');

    thenPointagesKeepTheirWorkstations(withoutWorkstation, [undefined]);
    thenPointagesKeepTheirWorkstations(defaultWorkstation, ['tour']);
    thenWorkstationChoiceIsRequested(choice);
    thenPointageTypesAre(chosen, ['DEBUT']);
    thenPointagesKeepTheirWorkstations(chosen, ['fraiseuse']);
  });

  it('should reconcile the current company and expose only the latest refusal born in this window until another intent', () => {
    const capture = whenDeciding('moule-1015', 'SECONDAIRE');
    const gestures = givenAcceptedDecision(capture);
    const refused = givenTheDecisionWasRefused(gestures);

    whenReconciling(refused);

    thenLatestRefusalNamesTheElement();
    whenDeciding('of-1015', 'PRINCIPALE');
    thenNoRefusalIsVisible();
  });

  it('should preserve an earlier window while recognizing a refusal reconciled before durable acceptance', () => {
    const previous = fenetre;
    const transition = fenetre.afterDeciding('moule-1015', 'SECONDAIRE', identifyFixture);
    if (transition.decision.kind !== 'GESTES') throw new Error('Expected gestures fixture.');
    const refused = givenTheDecisionWasRefused(transition.decision.capture());

    const reconciled = transition.fenetre.afterReconciling('entreprise-a', refused);

    expect(previous.refusal()).toBeUndefined();
    expect(reconciled.refusal()).toEqual({ contexte: { kind: 'ELEMENT', numero: '1015' }, message: "L'élément a été clôturé." });
  });

  it('should retain the designated operator and workstation qualifications frozen at opening through a referential reconciliation', () => {
    const opened = givenAMultiWorkstationWindow();
    const reconciled = opened.afterReconciling('entreprise-a', {
      ...structuredClone(vueFixture),
      referentiel: { operateurs: [], suivis: structuredClone(requiredFixture(vueFixture.referentiel, 'referential').suivis) },
    });

    const chosen = whenChoosingWith(reconciled, 'of-1015', 'PRINCIPALE', 'fraiseuse');

    expect(opened.operateur).toMatchObject({ id: 'jean', matricule: '049' });
    expect(reconciled.operateur).toMatchObject({ id: 'jean', matricule: '049' });
    thenPointagesKeepTheirWorkstations(chosen, ['fraiseuse']);
  });

  it('should retain accepted and refused gestures already reconciled without adding pending duplicates', () => {
    const decision = whenDeciding('moule-1015', 'SECONDAIRE');
    if (decision.kind !== 'GESTES') throw new Error('Expected gestures fixture.');
    const gestures = decision.capture();
    const reconciled = {
      ...structuredClone(vueFixture),
      evenements: gestures.map((geste, index) =>
        index === 0 ? acceptedFixture(geste) : { geste, etat: 'REFUSE' as const, refus: { code: 'suivi-cloture', message: 'Clôturé.' } },
      ),
    };

    fenetre = fenetre.afterReconciling('entreprise-a', reconciled).afterAccept(gestures);

    expect(fenetre.snapshot().evenements).toEqual(reconciled.evenements);
  });

  it('should retain the pointed element number when a refusal arrives after that element disappeared', () => {
    const capture = whenDeciding('moule-1015', 'SECONDAIRE');
    const gestures = givenAcceptedDecision(capture);
    const refused = givenTheDecisionWasRefusedAfterTheElementDisappeared(gestures, 'moule-1015');

    whenReconciling(refused);

    thenLatestRefusalNamesTheElement();
  });

  it('should ignore another company, reject a missing element and reject a workstation choice after concurrent activation', () => {
    const before = givenTheCurrentSnapshot();

    whenReconcilingFor('entreprise-b', EMPTY_JOURNAL_DU_PUPITRE);
    const missing = whenDecidingUnknownElement();
    const activeChoice = whenChoosingActiveElement();

    thenSnapshotIs(before);
    thenElementIsRefused(missing);
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

  it('should show a zero frozen duration for an activity created after the window opened and tolerate a reconciled empty reference', () => {
    const futureWindow = givenAWindowWithOnlyAFutureActivity();

    const futureView = whenReadingPointage(futureWindow);
    whenReconciling(EMPTY_JOURNAL_DU_PUPITRE);

    thenFutureActivityStartsAtZero(futureView);
    thenPointageViewIsEmpty();
  });

  it('should mark an element non conforme when its activities only contain non conformity', () => {
    const onlyNcJournal: JournalDuPupitre = {
      ...EMPTY_JOURNAL_DU_PUPITRE,
      referentiel: {
        operateurs: [{ id: 'jean', nom: 'Dupont', prenom: 'Jean', matricule: '049', postes: [] }],
        suivis: [
          {
            id: 'of-nc',
            nom: 'OF-NC',
            etat: 'EN_COURS',
            type: 'ORDRE_DE_FABRICATION',
            activites: [{ operateurId: 'jean', categorie: 'NON_CONFORMITE', depuis: '2026-09-05T08:30:00Z' }],
            evenements: [],
          },
        ],
      },
    };
    const localWindow = FenetreOperateur.open(
      'entreprise-a',
      onlyNcJournal,
      '049',
      Date.parse('2026-09-05T09:00:00Z'),
      new IdentiteDeFenetre(1),
    );

    expect(localWindow.pointage().ordresDeFabrication[0]?.isNonConforme()).toBe(true);
  });

  it('should resume only non conforming activities preserving their respective workstations', () => {
    const multiNcJournal: JournalDuPupitre = {
      ...EMPTY_JOURNAL_DU_PUPITRE,
      referentiel: {
        operateurs: [
          {
            id: 'jean',
            nom: 'Dupont',
            prenom: 'Jean',
            matricule: '049',
            postes: [
              { id: 'poste-1', libelle: 'Poste 1' },
              { id: 'poste-2', libelle: 'Poste 2' },
              { id: 'poste-3', libelle: 'Poste 3' },
            ],
          },
        ],
        suivis: [
          {
            id: 'of-multi-nc',
            nom: 'OF-MULTI',
            etat: 'EN_COURS',
            type: 'ORDRE_DE_FABRICATION',
            activites: [
              { operateurId: 'jean', categorie: 'NON_CONFORMITE', depuis: '2026-09-05T08:00:00Z', posteId: 'poste-1' },
              { operateurId: 'jean', categorie: 'TRAVAIL', depuis: '2026-09-05T08:15:00Z', posteId: 'poste-2' },
              { operateurId: 'jean', categorie: 'NON_CONFORMITE', depuis: '2026-09-05T08:30:00Z', posteId: 'poste-3' },
            ],
            evenements: [],
          },
        ],
      },
    };
    const multiWindow = FenetreOperateur.open(
      'entreprise-a',
      multiNcJournal,
      '049',
      Date.parse('2026-09-05T09:00:00Z'),
      new IdentiteDeFenetre(1),
    );

    const decision = multiWindow.afterDeciding('of-multi-nc', 'SECONDAIRE', identifyFixture).decision;

    expect(decision.kind).toBe('GESTES');
    if (decision.kind === 'GESTES') {
      const pointages = decision.capture().filter(geste => geste.nature === 'POINTAGE');
      expect(pointages.map(pointage => ({ type: pointage.type, posteId: pointage.posteId }))).toEqual([
        { type: 'DEBUT', posteId: 'poste-1' },
        { type: 'DEBUT', posteId: 'poste-3' },
      ]);
    }
  });

  it('should sort elements using natural numeric order', () => {
    const unsortedJournal: JournalDuPupitre = {
      ...EMPTY_JOURNAL_DU_PUPITRE,
      referentiel: {
        operateurs: [{ id: 'jean', nom: 'Dupont', prenom: 'Jean', matricule: '049', postes: [] }],
        suivis: [
          { id: 'of-10', nom: 'OF-10', etat: 'EN_ATTENTE', type: 'ORDRE_DE_FABRICATION', activites: [], evenements: [] },
          { id: 'of-2', nom: 'OF-2', etat: 'EN_ATTENTE', type: 'ORDRE_DE_FABRICATION', activites: [], evenements: [] },
          { id: 'of-1', nom: 'OF-1', etat: 'EN_ATTENTE', type: 'ORDRE_DE_FABRICATION', activites: [], evenements: [] },
        ],
      },
    };
    const sortWindow = FenetreOperateur.open(
      'entreprise-a',
      unsortedJournal,
      '049',
      Date.parse('2026-09-05T09:00:00Z'),
      new IdentiteDeFenetre(1),
    );

    const numeros = sortWindow.pointage().ordresDeFabrication.map(element => element.numero);

    expect(numeros).toEqual(['OF-1', 'OF-2', 'OF-10']);
  });

  it('should indicate glmActif is true when the operator has no active activities', () => {
    const inactiveJournal: JournalDuPupitre = {
      ...EMPTY_JOURNAL_DU_PUPITRE,
      referentiel: {
        operateurs: [{ id: 'jean', nom: 'Dupont', prenom: 'Jean', matricule: '049', postes: [] }],
        suivis: [{ id: 'of-1', nom: 'OF-1', etat: 'EN_ATTENTE', type: 'ORDRE_DE_FABRICATION', activites: [], evenements: [] }],
      },
    };
    const inactiveWindow = FenetreOperateur.open(
      'entreprise-a',
      inactiveJournal,
      '049',
      Date.parse('2026-09-05T09:00:00Z'),
      new IdentiteDeFenetre(1),
    );

    expect(inactiveWindow.pointage().glmActif).toBe(true);
  });

  it('should capture arrival, implicit resumption, and pointage when confirming workstation selection and clear visible refusal', () => {
    const multiPosteJournal: JournalDuPupitre = {
      ...EMPTY_JOURNAL_DU_PUPITRE,
      referentiel: {
        operateurs: [
          {
            id: 'jean',
            nom: 'Dupont',
            prenom: 'Jean',
            matricule: '049',
            postes: [
              { id: 'poste-1', libelle: 'Poste 1' },
              { id: 'poste-2', libelle: 'Poste 2' },
            ],
          },
        ],
        suivis: [{ id: 'of-multi', nom: 'OF-MULTI', etat: 'EN_ATTENTE', type: 'ORDRE_DE_FABRICATION', activites: [], evenements: [] }],
      },
    };
    const multiWindow = FenetreOperateur.open(
      'entreprise-a',
      multiPosteJournal,
      '049',
      Date.parse('2026-09-05T09:00:00Z'),
      new IdentiteDeFenetre(1),
    );

    const { fenetre: afterChoice, decision } = multiWindow.afterChoosingPoste('of-multi', 'PRINCIPALE', 'poste-1', identifyFixture);

    const gestures = decision.capture();
    thenGesturesAre(gestures, ['ARRIVEE', 'PRESENCE', 'POINTAGE']);
    expect(gestures[1]).toMatchObject({ nature: 'PRESENCE', type: 'REPRISE', implicite: true });
    expect(gestures[2]).toMatchObject({ nature: 'POINTAGE', type: 'DEBUT', posteId: 'poste-1' });
    expect(afterChoice.refusal()).toBeUndefined();
    const reconciled = afterChoice.afterReconciling('entreprise-a', givenTheDecisionWasRefused(gestures));
    expect(reconciled.refusal()).toBeDefined();
  });

  it('should increment intention counter monotonically across sequential decisions', () => {
    const first = fenetre.afterDeciding('moule-1015', 'PRINCIPALE', identifyFixture);
    fenetre = first.fenetre;
    expect(first.decision.kind).toBe('GESTES');
    if (first.decision.kind === 'GESTES') {
      expect(first.decision.intention).toBe(1);
    }

    const second = fenetre.afterDeciding('of-204', 'PRINCIPALE', identifyFixture);
    expect(second.decision.kind).toBe('GESTES');
    if (second.decision.kind === 'GESTES') {
      expect(second.decision.intention).toBe(2);
    }
  });

  it('should not assure arrival when accepting gestures that do not include an arrival', () => {
    const pointageOnly: GesteDAtelier = {
      id: 'pt-1',
      dateDeSurvenue: '2026-09-05T08:00:00Z',
      suiviId: 'moule-1015',
      type: 'FIN',
      nature: 'POINTAGE',
      operateurId: 'jean',
    };

    fenetre = fenetre.afterAccept([pointageOnly]);

    const nextDecision = fenetre.afterDeciding('of-204', 'PRINCIPALE', identifyFixture).decision;
    expect(nextDecision.kind).toBe('GESTES');
    if (nextDecision.kind === 'GESTES') {
      const captured = fenetre.capture(nextDecision);
      expect(captured.some(geste => geste.nature === 'ARRIVEE')).toBe(true);
    }
  });

  it('should not attach a global command context for departure presence', () => {
    const departLot = fenetre.preparePresence('DEPART', identifyFixture);

    expect(departLot.contextesParGeste.size).toBe(0);
  });

  it('should include arrival by default when capture is called without arguments on pointage decision', () => {
    const decision = fenetre.afterDeciding('moule-1015', 'PRINCIPALE', identifyFixture).decision;

    expect(decision.kind).toBe('GESTES');
    if (decision.kind === 'GESTES') {
      const gestures = decision.capture();
      expect(gestures[0]?.nature).toBe('ARRIVEE');
    }
  });

  const identifyFixture = (): IdentiteDuGeste => {
    const id = crypto.randomUUID();
    const dateDeSurvenue = new Date(Date.parse(dateDuGeste) + identities.size).toISOString();
    identities.set(id, dateDeSurvenue);
    return { id, dateDeSurvenue };
  };
  const givenAPreparedPointage = (): (() => readonly GesteDAtelier[]) => {
    const result = fenetre.afterDeciding('of-1015', 'PRINCIPALE', identifyFixture);
    fenetre = result.fenetre;
    if (result.decision.kind !== 'GESTES') throw new Error('Expected gestures fixture.');
    const decision = result.decision;
    return () => fenetre.capture(decision);
  };
  const givenTheRecordedIdentities = (): Map<string, string> => new Map(identities);
  const whenAnHourPasses = (): void => {
    dateDuGeste = '2026-09-05T09:00:00Z';
  };
  const whenResolvingTheOperator = (): FenetreOperateur['operateur'] =>
    FenetreOperateur.open('entreprise-a', structuredClone(vueFixture), '049', Date.parse('2026-09-05T09:00:00Z'), new IdentiteDeFenetre(1))
      .operateur;
  const whenReadingThePointageView = (): ReturnType<FenetreOperateur['pointage']> => fenetre.pointage();
  const givenTheCurrentSnapshot = (): JournalDuPupitre => fenetre.snapshot();
  const whenChangingTheSnapshot = (snapshot: JournalDuPupitre): void => {
    Object.assign(snapshot, { connecte: false });
    Object.assign(snapshot.evenements, { length: 0 });
    Object.assign(requiredFixture(snapshot.referentiel, 'referential').operateurs, { length: 0 });
  };
  const givenAJournalWithEveryEventState = (): JournalDuPupitre => {
    const geste = { nature: 'ARRIVEE' as const, operateurId: 'jean', id: 'arrivee', dateDeSurvenue: '2026-09-05T08:00:00Z' };
    return {
      connecte: true,
      evenements: [
        { geste, etat: 'EN_ATTENTE' },
        { geste, etat: 'ACCEPTE', journeeOuverte: true },
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
  const whenReadingPointage = (window: FenetreOperateur): ReturnType<FenetreOperateur['pointage']> => window.pointage();
  const givenAMultiWorkstationWindow = (): FenetreOperateur => {
    const referentiel = requiredFixture(vueFixture.referentiel, 'referential');
    const operateur = requiredFixture(referentiel.operateurs[0], 'operator');
    return FenetreOperateur.open(
      'entreprise-a',
      {
        ...vueFixture,
        referentiel: {
          ...referentiel,
          operateurs: [{ ...operateur, postes: [...operateur.postes, { id: 'fraiseuse', libelle: 'Fraiseuse' }] }],
        },
      },
      '049',
      Date.parse('2026-09-05T09:00:00Z'),
      new IdentiteDeFenetre(2),
    );
  };
  const givenAWindowWithoutWorkstation = (): FenetreOperateur => {
    const referentiel = requiredFixture(vueFixture.referentiel, 'referential');
    const operateur = requiredFixture(referentiel.operateurs[0], 'operator');
    return FenetreOperateur.open(
      'entreprise-a',
      { ...vueFixture, referentiel: { ...referentiel, operateurs: [{ ...operateur, postes: [] }] } },
      '049',
      Date.parse('2026-09-05T09:00:00Z'),
      new IdentiteDeFenetre(3),
    );
  };
  const whenDeciding = (suiviId: string, cible: 'PRINCIPALE' | 'SECONDAIRE'): DecisionDePointage => {
    const result = fenetre.afterDeciding(suiviId, cible, identifyFixture);
    fenetre = result.fenetre;
    return result.decision;
  };
  const whenDecidingWith = (owner: FenetreOperateur, suiviId: string, cible: 'PRINCIPALE' | 'SECONDAIRE'): DecisionDePointage =>
    owner.afterDeciding(suiviId, cible, identifyFixture).decision;
  const whenChoosingWith = (
    owner: FenetreOperateur,
    suiviId: string,
    cible: 'PRINCIPALE' | 'SECONDAIRE',
    posteId: string,
  ): LotDeGestesDAtelier => owner.afterChoosingPoste(suiviId, cible, posteId, identifyFixture).decision;
  const givenAcceptedDecision = (decision: DecisionDePointage): readonly GesteDAtelier[] => {
    if (decision.kind !== 'GESTES') throw new Error('Expected gestures fixture.');
    const gestures = decision.capture();
    fenetre = fenetre.afterAccept(gestures);
    return gestures;
  };
  const givenTheDecisionWasRefused = (gestures: readonly GesteDAtelier[]): JournalDuPupitre => ({
    ...structuredClone(vueFixture),
    evenements: gestures.map(geste => ({
      geste,
      etat: 'REFUSE',
      refus: { code: 'suivi-cloture', message: "L'élément a été clôturé." },
    })),
  });
  const givenTheDecisionWasRefusedAfterTheElementDisappeared = (gestures: readonly GesteDAtelier[], suiviId: string): JournalDuPupitre => {
    const refused = givenTheDecisionWasRefused(gestures);
    const referentiel = requiredFixture(refused.referentiel, 'referential');
    return { ...refused, referentiel: { ...referentiel, suivis: referentiel.suivis.filter(suivi => suivi.id !== suiviId) } };
  };
  const whenReconciling = (vue: JournalDuPupitre): void => {
    fenetre = fenetre.afterReconciling('entreprise-a', vue);
  };
  const whenReconcilingFor = (entreprise: string, vue: JournalDuPupitre): void => {
    fenetre = fenetre.afterReconciling(entreprise, vue);
  };
  const whenDecidingUnknownElement = (): unknown => {
    try {
      return fenetre.afterDeciding('inconnu', 'PRINCIPALE', identifyFixture);
    } catch (failure: unknown) {
      return failure;
    }
  };
  const whenChoosingActiveElement = (): unknown => {
    try {
      return fenetre.afterChoosingPoste('moule-1015', 'PRINCIPALE', 'tour', identifyFixture);
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
      'entreprise-a',
      {
        ...vueFixture,
        referentiel: {
          ...referentiel,
          suivis: [
            { ...suivi, activites: [{ operateurId: 'jean', categorie: 'TRAVAIL', depuis: '2026-09-05T10:00:00Z', posteId: 'tour' }] },
          ],
        },
      },
      '049',
      Date.parse('2026-09-05T09:00:00Z'),
      new IdentiteDeFenetre(4),
    );
  };
  const whenOpeningAnUnknownOperator = (vue: JournalDuPupitre): unknown => {
    try {
      return FenetreOperateur.open('entreprise-a', vue, 'inconnu', Date.parse('2026-09-05T09:00:00Z'), new IdentiteDeFenetre(5));
    } catch (failure: unknown) {
      return failure;
    }
  };
  const whenPointingAtAnUnauthorizedWorkstation = (): unknown => {
    try {
      return givenAMultiWorkstationWindow().afterChoosingPoste('of-1015', 'PRINCIPALE', 'interdit', identifyFixture);
    } catch (failure: unknown) {
      return failure;
    }
  };
  const whenCapturingPointage = (capture: () => readonly GesteDAtelier[]): readonly GesteDAtelier[] => capture();
  const whenAcceptingPointage = (capture: () => readonly GesteDAtelier[]): readonly GesteDAtelier[] => {
    const gestes = capture();
    fenetre = fenetre.afterAccept(gestes);
    return gestes;
  };
  const whenAcceptingAnExplicitPause = (): readonly GesteDAtelier[] => {
    const presence = fenetre.capture(fenetre.preparePresence('PAUSE', identifyFixture));
    fenetre = fenetre.afterAccept(presence);
    return presence;
  };
  const thenOperatorIsJean = (id: string): void => {
    expect(id).toBe('jean');
  };
  const thenPointageViewIsPersonalAndFrozen = (pointage: ReturnType<FenetreOperateur['pointage']>): void => {
    expect(pointage.moules.map(element => ({ id: element.id, numero: element.numero, dureeMs: element.dureeMs() }))).toEqual([
      { id: 'moule-1015', numero: '1015', dureeMs: 10_800_000 },
    ]);
    expect(pointage.moules[0]?.isNonConforme()).toBe(false);
    expect(pointage.moules[0]?.repliSurNom).toBe(false);
    expect(pointage.ordresDeFabrication.map(element => element.numero)).toEqual(['204', 'OF-2026-000042']);
    expect(pointage.ordresDeFabrication[0]?.isNonConforme()).toBe(true);
    expect(pointage.ordresDeFabrication[0]?.repliSurNom).toBe(false);
    expect(pointage.ordresDeFabrication[0]?.dureeMs()).toBe(1_800_000);
    expect(pointage.ordresDeFabrication[1]).toMatchObject({ repliSurNom: true });
    expect(pointage.ordresDeFabrication[1]?.isActive()).toBe(false);
    expect(pointage.ordresDeFabrication[1]?.isNonConforme()).toBe(false);
    expect(pointage.ordresDeFabrication[1]?.dureeMs()).toBe(0);
    expect(pointage.glmActif).toBe(false);
  };
  const thenPointageTypesAre = (decision: DecisionDePointage, types: string[]): void => {
    expect(decision.kind).toBe('GESTES');
    if (decision.kind === 'GESTES') {
      expect(
        decision
          .capture()
          .filter(geste => geste.nature === 'POINTAGE')
          .map(geste => geste.type),
      ).toEqual(types);
    }
  };
  const captureGestures = (decision: DecisionDePointage): readonly GesteDAtelier[] => {
    if (decision.kind !== 'GESTES') throw new Error('Expected gestures fixture.');
    return fenetre.capture(decision);
  };
  const thenPointagesKeepTheirWorkstations = (decision: DecisionDePointage, postes: (string | undefined)[]): void => {
    if (decision.kind !== 'GESTES') throw new Error('Expected gestures fixture.');
    expect(
      decision
        .capture()
        .filter(geste => geste.nature === 'POINTAGE')
        .map(geste => geste.posteId),
    ).toEqual(postes);
  };
  const thenWorkstationChoiceIsRequested = (decision: DecisionDePointage): void => {
    expect(decision).toMatchObject({
      kind: 'CHOIX_POSTE_REQUIS',
      numero: 'OF-2026-000042',
      postes: [
        { id: 'tour', libelle: 'Tour' },
        { id: 'fraiseuse', libelle: 'Fraiseuse' },
      ],
    });
  };
  const thenLatestRefusalNamesTheElement = (): void => {
    expect(fenetre.refusal()).toEqual({ contexte: { kind: 'ELEMENT', numero: '1015' }, message: "L'élément a été clôturé." });
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
    expect(pointage.moules[0]?.dureeMs()).toBe(0);
  };
  const thenPointageViewIsEmpty = (): void => {
    expect(fenetre.pointage()).toEqual({ moules: [], ordresDeFabrication: [], glmActif: true });
  };
  const thenWindowIsRefused = (refusal: unknown): void => {
    expect(refusal).toBeInstanceOf(Error);
    expect(refusal).toHaveProperty('message', expect.stringContaining('Matricule absent'));
  };
  const thenWorkstationIsRefused = (refusal: unknown): void => {
    expect(refusal).toBeInstanceOf(Error);
    expect(refusal).toHaveProperty('message', expect.stringContaining('habilitations'));
  };
  const thenGesturesAre = (gestes: readonly GesteDAtelier[], natures: string[]): void => {
    expect(gestes.map(geste => geste.nature)).toEqual(natures);
    expect(gestes.every(geste => geste.operateurId === 'jean')).toBe(true);
  };
  const thenOpeningSharesBusinessTime = (gestes: readonly GesteDAtelier[]): void => {
    const lastGesture = requiredFixture(gestes[2], 'last gesture');
    expect(gestes.map(geste => geste.dateDeSurvenue)).toEqual(Array<string | undefined>(3).fill(identities.get(lastGesture.id)));
  };
  const thenIdentitiesWerePreparedBeforeExecution = (gestes: readonly GesteDAtelier[], preparedIdentities: Map<string, string>): void => {
    expect(new Set(gestes.map(geste => geste.id)).size).toBe(gestes.length);
    expect(gestes.every(geste => preparedIdentities.has(geste.id))).toBe(true);
    expect(
      gestes.filter(geste => geste.nature === 'POINTAGE').every(geste => geste.dateDeSurvenue === preparedIdentities.get(geste.id)),
    ).toBe(true);
  };
  const thenAcceptedPresenceIsVisible = (gestes: readonly GesteDAtelier[]): void => {
    expect(fenetre.snapshot().evenements).toEqual(gestes.map(geste => ({ geste, etat: 'EN_ATTENTE' })));
    expect(gestes.at(-1)).toMatchObject({ nature: 'PRESENCE', type: 'PAUSE', implicite: false, operateurId: 'jean' });
  };
});
