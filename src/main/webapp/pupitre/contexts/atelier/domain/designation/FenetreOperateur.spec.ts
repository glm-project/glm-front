import { EMPTY_JOURNAL_DU_PUPITRE, GesteDAtelier, IdentiteDuGeste, JournalDuPupitre } from '../journal-du-pupitre/JournalDuPupitre';
import { DecisionDePointage, FenetreOperateur, GestesDePointage } from './FenetreOperateur';

const requiredFixture = <T>(value: T | null | undefined, description: string): T => {
  if (value === null || value === undefined) {
    throw new Error(`Missing ${description} fixture.`);
  }
  return value;
};

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
    fenetre = FenetreOperateur.open('entreprise-a', structuredClone(vueFixture), '049', Date.parse('2026-09-05T09:00:00Z'), 1);
    dateDuGeste = '2026-09-05T08:00:00Z';
    identities = new Map<string, string>();
  });

  it('should resolve the operator from the company referential', () => {
    const operateur = whenResolvingTheOperator();

    thenOperatorIsJean(operateur.id);
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
    thenGesturesAre(secondGestures, ['POINTAGE']);
    thenIdentitiesWerePreparedBeforeExecution([...firstGestures, ...secondGestures], preparedIdentities);
    thenOpeningSharesBusinessTime(firstGestures);
  });

  it('should keep requiring arrival until a pointage has been committed', () => {
    const first = givenAPreparedPointage();
    const retry = givenAPreparedPointage();

    whenCapturingPointage(first);
    const presence = whenAcceptingAnExplicitPause();
    const retriedGestures = whenCapturingPointage(retry);

    thenGesturesAre(retriedGestures, ['ARRIVEE', 'PRESENCE', 'POINTAGE']);
    thenOnlyExplicitPresenceIsVisible(presence);
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
    expect(reconciled.refusal()).toEqual({ numero: '1015', message: "L'élément a été clôturé." });
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
        index === 0
          ? { geste, etat: 'ACCEPTE' as const }
          : { geste, etat: 'REFUSE' as const, refus: { code: 'suivi-cloture', message: 'Clôturé.' } },
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
    FenetreOperateur.open('entreprise-a', structuredClone(vueFixture), '049', Date.parse('2026-09-05T09:00:00Z'), 1).operateur;
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
      2,
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
      3,
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
  ): GestesDePointage => owner.afterChoosingPoste(suiviId, cible, posteId, identifyFixture).decision;
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
      4,
    );
  };
  const whenOpeningAnUnknownOperator = (vue: JournalDuPupitre): unknown => {
    try {
      return FenetreOperateur.open('entreprise-a', vue, 'inconnu', Date.parse('2026-09-05T09:00:00Z'), 5);
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
  const whenAcceptingAnExplicitPause = (): GesteDAtelier[] => {
    const presence = fenetre.preparePresence('PAUSE', identifyFixture());
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
    expect(pointage.ordresDeFabrication.map(element => element.numero)).toEqual(['204', 'OF-2026-000042']);
    expect(pointage.ordresDeFabrication[0]?.isNonConforme()).toBe(true);
    expect(pointage.ordresDeFabrication[0]?.dureeMs()).toBe(1_800_000);
    expect(pointage.ordresDeFabrication[1]).toMatchObject({ repliSurNom: true });
    expect(pointage.ordresDeFabrication[1]?.isActive()).toBe(false);
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
    expect(fenetre.refusal()).toEqual({ numero: '1015', message: "L'élément a été clôturé." });
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
  const thenOnlyExplicitPresenceIsVisible = (gestes: readonly GesteDAtelier[]): void => {
    expect(fenetre.snapshot().evenements).toEqual(gestes.map(geste => ({ geste, etat: 'EN_ATTENTE' })));
    expect(gestes[0]).toMatchObject({ nature: 'PRESENCE', type: 'PAUSE', implicite: false, operateurId: 'jean' });
  };
});
