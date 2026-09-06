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
    const other = FenetreOperateur.open('atelier', referenceFixture, '049', 1, 1);

    designation = designation.afterReplacingWindow(other);

    expect(designation).toBe(before);
    thenOperatorIsDesignated();
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
