import { FenetreOperateur } from './FenetreOperateur';
import { EMPTY_PUPITRE, IdentiteDuGeste, LocalGeste, LocalPupitreState } from './LocalPupitreState';

const requiredFixture = <T>(value: T | null | undefined, description: string): T => {
  if (value === null || value === undefined) {
    throw new Error(`Missing ${description} fixture.`);
  }
  return value;
};

const vueFixture: LocalPupitreState = {
  ...EMPTY_PUPITRE,
  referentiel: {
    operateurs: [{ id: 'jean', nom: 'Dupont', prenom: 'Jean', matricule: '049', postes: [{ id: 'tour', libelle: 'Tour' }] }],
    suivis: [],
  },
};

describe('FenetreOperateur', () => {
  let fenetre: FenetreOperateur;
  let dateDuGeste: string;
  let identities: Map<string, string>;

  beforeEach(() => {
    fenetre = new FenetreOperateur('entreprise-a', structuredClone(vueFixture), '049');
    dateDuGeste = '2026-09-05T08:00:00Z';
    identities = new Map<string, string>();
  });

  it('should resolve the operator from the company referential', () => {
    const operateur = whenResolvingTheOperator();

    thenOperatorIsJean(operateur.id);
  });

  it('should refuse a code absent from a cached referential or without any referential', () => {
    const withReference = whenOpeningAnUnknownOperator(vueFixture);
    const withoutReference = whenOpeningAnUnknownOperator(EMPTY_PUPITRE);

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

  const identifyFixture = (): IdentiteDuGeste => {
    const id = crypto.randomUUID();
    const dateDeSurvenue = new Date(Date.parse(dateDuGeste) + identities.size).toISOString();
    identities.set(id, dateDeSurvenue);
    return { id, dateDeSurvenue };
  };
  const givenAPreparedPointage = (): (() => LocalGeste[]) =>
    fenetre.preparePointage({ suiviId: 'piece', type: 'DEBUT', posteId: 'tour' }, identifyFixture);
  const givenTheRecordedIdentities = (): Map<string, string> => new Map(identities);
  const whenAnHourPasses = (): void => {
    dateDuGeste = '2026-09-05T09:00:00Z';
  };
  const whenResolvingTheOperator = (): FenetreOperateur['operateur'] =>
    new FenetreOperateur('entreprise-a', structuredClone(vueFixture), '049').operateur;
  const whenOpeningAnUnknownOperator = (vue: LocalPupitreState): unknown => {
    try {
      return new FenetreOperateur('entreprise-a', vue, 'inconnu');
    } catch (failure: unknown) {
      return failure;
    }
  };
  const whenPointingAtAnUnauthorizedWorkstation = (): unknown => {
    try {
      return fenetre.preparePointage({ suiviId: 'piece', type: 'DEBUT', posteId: 'interdit' }, identifyFixture);
    } catch (failure: unknown) {
      return failure;
    }
  };
  const whenCapturingPointage = (capture: () => LocalGeste[]): LocalGeste[] => capture();
  const whenAcceptingPointage = (capture: () => LocalGeste[]): LocalGeste[] => {
    const gestes = capture();
    fenetre.accept(gestes);
    return gestes;
  };
  const whenAcceptingAnExplicitPause = (): LocalGeste[] => {
    const presence = fenetre.preparePresence('PAUSE', identifyFixture());
    fenetre.accept(presence);
    return presence;
  };
  const thenOperatorIsJean = (id: string): void => {
    expect(id).toBe('jean');
  };
  const thenWindowIsRefused = (refusal: unknown): void => {
    expect(refusal).toBeInstanceOf(Error);
    expect(refusal).toHaveProperty('message', expect.stringContaining('Matricule absent'));
  };
  const thenWorkstationIsRefused = (refusal: unknown): void => {
    expect(refusal).toBeInstanceOf(Error);
    expect(refusal).toHaveProperty('message', expect.stringContaining('habilitations'));
  };
  const thenGesturesAre = (gestes: LocalGeste[], natures: string[]): void => {
    expect(gestes.map(geste => geste.nature)).toEqual(natures);
    expect(gestes.every(geste => geste.operateurId === 'jean')).toBe(true);
  };
  const thenOpeningSharesBusinessTime = (gestes: LocalGeste[]): void => {
    const lastGesture = requiredFixture(gestes[2], 'last gesture');
    expect(gestes.map(geste => geste.dateDeSurvenue)).toEqual(Array<string | undefined>(3).fill(identities.get(lastGesture.id)));
  };
  const thenIdentitiesWerePreparedBeforeExecution = (gestes: LocalGeste[], preparedIdentities: Map<string, string>): void => {
    expect(new Set(gestes.map(geste => geste.id)).size).toBe(gestes.length);
    expect(gestes.every(geste => preparedIdentities.has(geste.id))).toBe(true);
    expect(
      gestes.filter(geste => geste.nature === 'POINTAGE').every(geste => geste.dateDeSurvenue === preparedIdentities.get(geste.id)),
    ).toBe(true);
  };
  const thenOnlyExplicitPresenceIsVisible = (gestes: LocalGeste[]): void => {
    expect(fenetre.snapshot().evenements).toEqual(gestes.map(geste => ({ geste, etat: 'EN_ATTENTE' })));
    expect(gestes[0]).toMatchObject({ nature: 'PRESENCE', type: 'PAUSE', implicite: false, operateurId: 'jean' });
  };
});
