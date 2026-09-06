import { EMPTY_JOURNAL_DU_PUPITRE, GesteDAtelier, IdentiteDuGeste, JournalDuPupitre } from '../journal-du-pupitre/JournalDuPupitre';
import { FenetreOperateur } from './FenetreOperateur';

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
    fenetre = new FenetreOperateur('entreprise-a', structuredClone(vueFixture), '049', Date.parse('2026-09-05T09:00:00Z'));
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
  const givenAPreparedPointage = (): (() => GesteDAtelier[]) => {
    const decision = fenetre.decide('of-1015', 'PRINCIPALE', identifyFixture);
    if (decision.kind !== 'GESTES') throw new Error('Expected gestures fixture.');
    return decision.capture;
  };
  const givenTheRecordedIdentities = (): Map<string, string> => new Map(identities);
  const whenAnHourPasses = (): void => {
    dateDuGeste = '2026-09-05T09:00:00Z';
  };
  const whenResolvingTheOperator = (): FenetreOperateur['operateur'] =>
    new FenetreOperateur('entreprise-a', structuredClone(vueFixture), '049', Date.parse('2026-09-05T09:00:00Z')).operateur;
  const whenReadingThePointageView = (): ReturnType<FenetreOperateur['pointage']> => fenetre.pointage();
  const givenTheCurrentSnapshot = (): JournalDuPupitre => fenetre.snapshot();
  const whenReadingPointage = (window: FenetreOperateur): ReturnType<FenetreOperateur['pointage']> => window.pointage();
  const givenAMultiWorkstationWindow = (): FenetreOperateur => {
    const vue = structuredClone(vueFixture);
    requiredFixture(vue.referentiel, 'referential').operateurs[0]?.postes.push({ id: 'fraiseuse', libelle: 'Fraiseuse' });
    return new FenetreOperateur('entreprise-a', vue, '049', Date.parse('2026-09-05T09:00:00Z'));
  };
  const givenAWindowWithoutWorkstation = (): FenetreOperateur => {
    const vue = structuredClone(vueFixture);
    requiredFixture(requiredFixture(vue.referentiel, 'referential').operateurs[0], 'operator').postes = [];
    return new FenetreOperateur('entreprise-a', vue, '049', Date.parse('2026-09-05T09:00:00Z'));
  };
  const whenDeciding = (suiviId: string, cible: 'PRINCIPALE' | 'SECONDAIRE'): ReturnType<FenetreOperateur['decide']> =>
    fenetre.decide(suiviId, cible, identifyFixture);
  const whenDecidingWith = (
    owner: FenetreOperateur,
    suiviId: string,
    cible: 'PRINCIPALE' | 'SECONDAIRE',
  ): ReturnType<FenetreOperateur['decide']> => owner.decide(suiviId, cible, identifyFixture);
  const whenChoosingWith = (
    owner: FenetreOperateur,
    suiviId: string,
    cible: 'PRINCIPALE' | 'SECONDAIRE',
    posteId: string,
  ): ReturnType<FenetreOperateur['choosePoste']> => owner.choosePoste(suiviId, cible, posteId, identifyFixture);
  const givenAcceptedDecision = (decision: ReturnType<FenetreOperateur['decide']>): GesteDAtelier[] => {
    if (decision.kind !== 'GESTES') throw new Error('Expected gestures fixture.');
    const gestures = decision.capture();
    fenetre.accept(gestures);
    return gestures;
  };
  const givenTheDecisionWasRefused = (gestures: GesteDAtelier[]): JournalDuPupitre => ({
    ...structuredClone(vueFixture),
    evenements: gestures.map(geste => ({
      geste,
      etat: 'REFUSE',
      refus: { code: 'suivi-cloture', message: "L'élément a été clôturé." },
    })),
  });
  const givenTheDecisionWasRefusedAfterTheElementDisappeared = (gestures: GesteDAtelier[], suiviId: string): JournalDuPupitre => {
    const refused = givenTheDecisionWasRefused(gestures);
    const referentiel = requiredFixture(refused.referentiel, 'referential');
    referentiel.suivis = referentiel.suivis.filter(suivi => suivi.id !== suiviId);
    return refused;
  };
  const whenReconciling = (vue: JournalDuPupitre): void => {
    fenetre.reconcile('entreprise-a', vue);
  };
  const whenReconcilingFor = (entreprise: string, vue: JournalDuPupitre): void => {
    fenetre.reconcile(entreprise, vue);
  };
  const whenDecidingUnknownElement = (): unknown => {
    try {
      return fenetre.decide('inconnu', 'PRINCIPALE', identifyFixture);
    } catch (failure: unknown) {
      return failure;
    }
  };
  const whenChoosingActiveElement = (): unknown => {
    try {
      return fenetre.choosePoste('moule-1015', 'PRINCIPALE', 'tour', identifyFixture);
    } catch (failure: unknown) {
      return failure;
    }
  };
  const givenAWindowWithOnlyAFutureActivity = (): FenetreOperateur => {
    const vue = structuredClone(vueFixture);
    const referentiel = requiredFixture(vue.referentiel, 'referential');
    referentiel.suivis = [
      requiredFixture(
        referentiel.suivis.find(suivi => suivi.id === 'moule-1015'),
        'moule',
      ),
    ];
    requiredFixture(referentiel.suivis[0], 'moule').activites = [
      { operateurId: 'jean', categorie: 'TRAVAIL', depuis: '2026-09-05T10:00:00Z', posteId: 'tour' },
    ];
    return new FenetreOperateur('entreprise-a', vue, '049', Date.parse('2026-09-05T09:00:00Z'));
  };
  const whenOpeningAnUnknownOperator = (vue: JournalDuPupitre): unknown => {
    try {
      return new FenetreOperateur('entreprise-a', vue, 'inconnu', Date.parse('2026-09-05T09:00:00Z'));
    } catch (failure: unknown) {
      return failure;
    }
  };
  const whenPointingAtAnUnauthorizedWorkstation = (): unknown => {
    try {
      return givenAMultiWorkstationWindow().choosePoste('of-1015', 'PRINCIPALE', 'interdit', identifyFixture);
    } catch (failure: unknown) {
      return failure;
    }
  };
  const whenCapturingPointage = (capture: () => GesteDAtelier[]): GesteDAtelier[] => capture();
  const whenAcceptingPointage = (capture: () => GesteDAtelier[]): GesteDAtelier[] => {
    const gestes = capture();
    fenetre.accept(gestes);
    return gestes;
  };
  const whenAcceptingAnExplicitPause = (): GesteDAtelier[] => {
    const presence = fenetre.preparePresence('PAUSE', identifyFixture());
    fenetre.accept(presence);
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
  const thenPointageTypesAre = (decision: ReturnType<FenetreOperateur['decide']>, types: string[]): void => {
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
  const thenPointagesKeepTheirWorkstations = (decision: ReturnType<FenetreOperateur['decide']>, postes: (string | undefined)[]): void => {
    if (decision.kind !== 'GESTES') throw new Error('Expected gestures fixture.');
    expect(
      decision
        .capture()
        .filter(geste => geste.nature === 'POINTAGE')
        .map(geste => geste.posteId),
    ).toEqual(postes);
  };
  const thenWorkstationChoiceIsRequested = (decision: ReturnType<FenetreOperateur['decide']>): void => {
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
    expect(fenetre.refus()).toEqual({ numero: '1015', message: "L'élément a été clôturé." });
  };
  const thenNoRefusalIsVisible = (): void => {
    expect(fenetre.refus()).toBeUndefined();
  };
  const thenSnapshotIs = (expected: JournalDuPupitre): void => {
    expect(fenetre.snapshot()).toBe(expected);
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
  const thenGesturesAre = (gestes: GesteDAtelier[], natures: string[]): void => {
    expect(gestes.map(geste => geste.nature)).toEqual(natures);
    expect(gestes.every(geste => geste.operateurId === 'jean')).toBe(true);
  };
  const thenOpeningSharesBusinessTime = (gestes: GesteDAtelier[]): void => {
    const lastGesture = requiredFixture(gestes[2], 'last gesture');
    expect(gestes.map(geste => geste.dateDeSurvenue)).toEqual(Array<string | undefined>(3).fill(identities.get(lastGesture.id)));
  };
  const thenIdentitiesWerePreparedBeforeExecution = (gestes: GesteDAtelier[], preparedIdentities: Map<string, string>): void => {
    expect(new Set(gestes.map(geste => geste.id)).size).toBe(gestes.length);
    expect(gestes.every(geste => preparedIdentities.has(geste.id))).toBe(true);
    expect(
      gestes.filter(geste => geste.nature === 'POINTAGE').every(geste => geste.dateDeSurvenue === preparedIdentities.get(geste.id)),
    ).toBe(true);
  };
  const thenOnlyExplicitPresenceIsVisible = (gestes: GesteDAtelier[]): void => {
    expect(fenetre.snapshot().evenements).toEqual(gestes.map(geste => ({ geste, etat: 'EN_ATTENTE' })));
    expect(gestes[0]).toMatchObject({ nature: 'PRESENCE', type: 'PAUSE', implicite: false, operateurId: 'jean' });
  };
});
