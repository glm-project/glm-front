import { IdentiteDeFenetre } from '@/pupitre/contexts/atelier/domain/designation/IdentiteDeFenetre';
import { EMPTY_JOURNAL_DU_PUPITRE, GesteDAtelier, IdentiteDuGeste, JournalDuPupitre } from '../journal-du-pupitre/JournalDuPupitre';
import { DesignationOperateur, DesignationResolution } from './DesignationOperateur';
import { FenetreOperateur } from './FenetreOperateur';

const referenceFixture: JournalDuPupitre = {
  ...EMPTY_JOURNAL_DU_PUPITRE,
  referentiel: {
    operateurs: [{ id: 'jean', nom: 'Dupont', prenom: 'Jean', matricule: '049', postes: [] }],
    suivis: [{ id: 'piece', nom: 'OF-1', etat: 'EN_ATTENTE', type: 'ORDRE_DE_FABRICATION', activites: [], evenements: [] }],
  },
};
const identityFixture = (): IdentiteDuGeste => ({ id: 'geste', dateDeSurvenue: '2026-09-05T08:00:29.000Z' });

describe('DesignationOperateur', () => {
  let designation: DesignationOperateur;
  beforeEach(() => {
    designation = DesignationOperateur.empty();
  });

  it('should require a selected entreprise to reconcile even before an operator is designated', () => {
    expect(designation.canReconcileWith(undefined)).toBe(false);
  });

  it('should refuse to attribute a pointage at the inactivity deadline without a screen callback', () => {
    givenDesignatedOperator();

    thenPointageIsRefusedAt(30_000);
    thenNoOperatorIsDesignated();
  });

  it('should renew designation when accepting a gesture and preserve its attribution after expiry', () => {
    givenDesignatedOperator();

    const capture = whenPreparingPointage(29_000);
    whenCheckingExpiration(30_000);
    thenOperatorIsDesignated();
    whenCheckingExpiration(59_000);

    thenNoOperatorIsDesignated();
    thenPreparedPointageBelongsToJean(capture);
    thenPointageIsRefusedAt(59_000);
  });

  it('should keep a new partial code when a cancelled local resolution finally succeeds', () => {
    whenEntering('049', 0);
    const resolution = whenValidating(0);
    whenCheckingExpiration(30_000);
    whenEntering('9', 30_001);

    whenResolving(resolution, 30_002);

    thenCodeIs('9');
    thenNoOperatorIsDesignated();
  });

  it('should keep a new partial code when a cancelled local resolution finally fails', () => {
    whenEntering('049', 0);
    const resolution = whenValidating(0);
    whenCheckingExpiration(30_000);
    whenEntering('9', 30_001);

    whenFailingResolution(resolution, 30_002);

    thenCodeIs('9');
    thenNoOperatorIsDesignated();
  });

  it('should preserve earlier designation snapshots across input and closure transitions', () => {
    const empty = designation;

    whenEntering('0', 0);
    const partial = designation;
    whenEntering('4', 1);
    designation = designation.afterFinish();

    expect(empty.snapshot()).toMatchObject({ code: '', canValidate: false, operateur: undefined });
    expect(partial.snapshot()).toMatchObject({ code: '0', canValidate: true, operateur: undefined });
    expect(designation.snapshot()).toMatchObject({ code: '', canValidate: false, operateur: undefined });
  });

  it('should leave a designation unchanged when another operator window tries to replace it', () => {
    givenDesignatedOperator();
    const before = designation;
    const other = FenetreOperateur.open('atelier', referenceFixture, '049', 1, new IdentiteDeFenetre(1));

    designation = designation.afterReplacingWindow(other);

    expect(designation).toBe(before);
    thenOperatorIsDesignated();
  });

  it('should ignore non-digit or multi-character input when entering a code', () => {
    designation = designation.afterDigit('a', 0);
    designation = designation.afterDigit('12', 0);
    designation = designation.afterDigit('a1', 0);
    designation = designation.afterDigit('1a', 0);

    thenCodeIs('');
  });

  it('should ignore digits and erasing when an operator is already designated', () => {
    givenDesignatedOperator();

    designation = designation.afterDigit('1', 0);
    thenCodeIs('');

    designation = designation.afterErasing(0);
    thenCodeIs('');
    thenOperatorIsDesignated();
  });

  it('should ignore digits and erasing while a code resolution is in flight', () => {
    whenEntering('049', 0);
    whenValidating(0);

    designation = designation.afterDigit('1', 0);
    thenCodeIs('049');

    designation = designation.afterErasing(0);
    thenCodeIs('049');
  });

  it('should ignore digit entry and erasing when pressed at or after inactivity deadline', () => {
    whenEntering('04', 0);

    designation = designation.afterDigit('9', 30_000);

    thenCodeIs('');
    thenNoOperatorIsDesignated();

    whenEntering('04', 30_001);
    designation = designation.afterErasing(60_001);

    thenCodeIs('');
  });

  it('should forbid validating a new code while a cancelled resolution is still pending completion', () => {
    whenEntering('049', 0);
    whenValidating(0);
    whenCheckingExpiration(30_000);
    whenEntering('9', 30_001);

    expect(designation.snapshot().canValidate).toBe(false);
    expect(designation.afterBeginningResolution(30_001).resolution).toBeUndefined();
  });

  it('should clear entered code upon successful resolution completion', () => {
    whenEntering('049', 0);
    const resolution = whenValidating(0);
    const opening = designation.afterOpeningWindow('atelier', referenceFixture, resolution.code, 0);
    designation = opening.designation;

    const completion = designation.afterCompletingResolution(resolution, 0);

    expect(completion.accepted).toBe(true);
    expect(completion.designation.snapshot().code).toBe('');
  });

  it('should reject resolution completion when the resolution generation is stale', () => {
    whenEntering('049', 0);
    const staleResolution = whenValidating(0);
    whenCheckingExpiration(30_000);

    const completion = designation.afterCompletingResolution(staleResolution, 30_000);

    expect(completion.accepted).toBe(false);
  });

  it('should forbid opening an operator window when one is already open or closing', () => {
    givenDesignatedOperator();

    expect(() => designation.afterOpeningWindow('atelier', referenceFixture, '049', 0)).toThrow('Une fenetre operateur est deja ouverte.');

    designation = designation.afterFinish();
    expect(designation.needsClosure()).toBe(true);
    expect(() => designation.afterOpeningWindow('atelier', referenceFixture, '049', 0)).toThrow('Une fenetre operateur est deja ouverte.');
  });

  it('should increment resolution generation and window identities across lifecycles', () => {
    whenEntering('049', 0);
    const firstResolution = whenValidating(0);
    expect(firstResolution.generation).toBe(0);

    designation = designation.afterFinish().afterEndingResolution();
    whenEntering('049', 1);
    const secondResolution = whenValidating(1);
    expect(secondResolution.generation).toBe(1);

    const firstWindow = designation.afterOpeningWindow('atelier', referenceFixture, '049', 1).fenetre;
    designation = designation.afterReleasingWindow();
    const secondWindow = designation.afterOpeningWindow('atelier', referenceFixture, '049', 1).fenetre;

    expect(secondWindow.hasIdentity(FenetreOperateur.open('atelier', referenceFixture, '049', 1, new IdentiteDeFenetre(1)))).toBe(true);
    expect(secondWindow.hasIdentity(firstWindow)).toBe(false);
  });

  const givenDesignatedOperator = (): void => {
    whenEntering('049', 0);
    whenResolving(whenValidating(0), 0);
  };
  const whenEntering = (code: string, now: number): void => {
    for (const digit of code) designation = designation.afterDigit(digit, now);
  };
  const whenValidating = (now: number): DesignationResolution => {
    const result = designation.afterBeginningResolution(now);
    designation = result.designation;
    if (result.resolution === undefined) throw new Error('Expected a designation resolution');
    return result.resolution;
  };
  const whenResolving = (resolution: DesignationResolution, now: number): void => {
    const opening = designation.afterOpeningWindow('atelier', referenceFixture, resolution.code, now);
    designation = opening.designation;
    const completion = designation.afterCompletingResolution(resolution, now);
    designation = completion.designation;
    if (!completion.accepted) designation = designation.afterReleasingWindow();
    designation = designation.afterEndingResolution();
  };
  const whenFailingResolution = (resolution: DesignationResolution, now: number): void => {
    designation = designation.afterFailingResolution(resolution, now);
    designation = designation.afterEndingResolution();
  };
  const whenCheckingExpiration = (now: number): void => {
    designation = designation.afterExpiration(now);
  };
  const whenPreparingPointage = (now: number): (() => readonly GesteDAtelier[]) => {
    const access = designation.windowAfterPress(now);
    designation = access.designation;
    if (access.fenetre === undefined) throw new Error('Aucune fenetre operateur ouverte.');
    const { fenetre, decision } = access.fenetre.afterDeciding('piece', 'PRINCIPALE', identityFixture);
    designation = designation.afterReplacingWindow(fenetre);
    if (decision.kind !== 'GESTES') throw new Error('Expected gestures fixture.');
    return () => fenetre.capture(decision);
  };
  const thenPointageIsRefusedAt = (now: number): void => {
    expect(() => whenPreparingPointage(now)).toThrow('Aucune fenetre operateur ouverte.');
  };
  const thenNoOperatorIsDesignated = (): void => {
    expect(designation.snapshot().operateur).toBeUndefined();
  };
  const thenOperatorIsDesignated = (): void => {
    expect(designation.snapshot().operateur?.id).toBe('jean');
  };
  const thenCodeIs = (code: string): void => {
    expect(designation.snapshot().code).toBe(code);
    expect(designation.snapshot().unknownCode).toBe(false);
  };
  const thenPreparedPointageBelongsToJean = (capture: () => readonly GesteDAtelier[]): void => {
    expect(capture()).toContainEqual({
      ...identityFixture(),
      suiviId: 'piece',
      type: 'DEBUT',
      operateurId: 'jean',
      nature: 'POINTAGE',
    });
  };
});
