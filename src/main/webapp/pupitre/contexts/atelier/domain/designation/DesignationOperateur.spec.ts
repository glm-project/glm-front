import { IdentiteDeFenetre } from '@/pupitre/contexts/atelier/domain/designation/IdentiteDeFenetre';
import { Entreprise } from '../journal-du-pupitre/Entreprise';
import { EMPTY_JOURNAL_DU_PUPITRE, GesteDAtelier, IdentiteDuGeste, JournalDuPupitre } from '../journal-du-pupitre/JournalDuPupitre';
import { DesignationOperateur, DesignationResolution } from './DesignationOperateur';
import { FenetreOperateur } from './FenetreOperateur';
import { Matricule } from './Matricule';

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

  it('should renew the inactivity deadline when a gesture is prepared', () => {
    givenDesignatedOperator();

    whenPreparingPointage(29_000);
    whenCheckingExpiration(30_000);

    thenOperatorIsDesignated();
  });

  it('should keep a prepared pointage attributed to its operator once the renewed deadline expires', () => {
    givenDesignatedOperator();
    const capture = whenPreparingPointage(29_000);

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
    const other = FenetreOperateur.open(Entreprise.of('atelier'), referenceFixture, Matricule.of('049'), 1, new IdentiteDeFenetre(1));

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

  it('should ignore a digit when an operator is already designated', () => {
    givenDesignatedOperator();

    whenEntering('1', 0);

    thenCodeIs('');
    thenOperatorIsDesignated();
  });

  it('should ignore erasing when an operator is already designated', () => {
    givenDesignatedOperator();

    whenErasing(0);

    thenCodeIs('');
    thenOperatorIsDesignated();
  });

  it('should ignore a digit while a code resolution is in flight', () => {
    whenEntering('049', 0);
    whenValidating(0);

    whenEntering('1', 0);

    thenCodeIs('049');
  });

  it('should ignore erasing while a code resolution is in flight', () => {
    whenEntering('049', 0);
    whenValidating(0);

    whenErasing(0);

    thenCodeIs('049');
  });

  it('should ignore a digit pressed at the inactivity deadline', () => {
    whenEntering('04', 0);

    whenEntering('9', 30_000);

    thenCodeIs('');
    thenNoOperatorIsDesignated();
  });

  it('should ignore erasing pressed after the inactivity deadline', () => {
    whenEntering('04', 30_001);

    whenErasing(60_001);

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
    const opening = designation.afterOpeningWindow(Entreprise.of('atelier'), referenceFixture, resolution.code, 0);
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

  it('should forbid opening an operator window while one is already open', () => {
    givenDesignatedOperator();

    thenOpeningAWindowIsForbidden();
  });

  it('should forbid opening an operator window while the previous one is closing', () => {
    givenDesignatedOperator();

    designation = designation.afterFinish();

    expect(designation.needsClosure()).toBe(true);
    thenOpeningAWindowIsForbidden();
  });

  it('should increment the resolution generation across designation lifecycles', () => {
    whenEntering('049', 0);
    const firstResolution = whenValidating(0);
    designation = designation.afterFinish().afterEndingResolution();
    whenEntering('049', 1);

    const secondResolution = whenValidating(1);

    expect([firstResolution.generation, secondResolution.generation]).toEqual([0, 1]);
  });

  it('should give the next operator window its own identity once the previous one is released', () => {
    whenEntering('049', 0);
    whenValidating(0);
    const firstWindow = whenOpeningAWindow();

    designation = designation.afterReleasingWindow();

    const secondWindow = whenOpeningAWindow();
    expect(secondWindow.hasIdentity(firstWindow)).toBe(false);
    expect(secondWindow.hasIdentity(givenAWindowWithIdentity(1))).toBe(true);
  });

  const givenDesignatedOperator = (): void => {
    whenEntering('049', 0);
    whenResolving(whenValidating(0), 0);
  };
  const whenEntering = (code: string, now: number): void => {
    for (const digit of code) designation = designation.afterDigit(digit, now);
  };
  const whenErasing = (now: number): void => {
    designation = designation.afterErasing(now);
  };
  const whenOpeningAWindow = (): FenetreOperateur =>
    designation.afterOpeningWindow(Entreprise.of('atelier'), referenceFixture, Matricule.of('049'), 1).fenetre;
  const givenAWindowWithIdentity = (identity: number): FenetreOperateur =>
    FenetreOperateur.open(Entreprise.of('atelier'), referenceFixture, Matricule.of('049'), 1, new IdentiteDeFenetre(identity));
  const whenValidating = (now: number): DesignationResolution => {
    const result = designation.afterBeginningResolution(now);
    designation = result.designation;
    if (result.resolution === undefined) throw new Error('Expected a designation resolution');
    return result.resolution;
  };
  const whenResolving = (resolution: DesignationResolution, now: number): void => {
    const opening = designation.afterOpeningWindow(Entreprise.of('atelier'), referenceFixture, resolution.code, now);
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
  const thenOpeningAWindowIsForbidden = (): void => {
    expect(() => whenOpeningAWindow()).toThrow('Une fenetre operateur est deja ouverte.');
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
