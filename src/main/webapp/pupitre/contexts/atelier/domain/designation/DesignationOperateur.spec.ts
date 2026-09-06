import { EMPTY_PUPITRE, IdentiteDuGeste, LocalGeste, LocalPupitreState } from '../journal/LocalPupitreState';
import { DesignationOperateur, DesignationResolution } from './DesignationOperateur';

const referenceFixture: LocalPupitreState = {
  ...EMPTY_PUPITRE,
  referentiel: {
    operateurs: [{ id: 'jean', nom: 'Dupont', prenom: 'Jean', matricule: '049', postes: [] }],
    suivis: [],
  },
};
const identityFixture = (): IdentiteDuGeste => ({ id: 'geste', dateDeSurvenue: '2026-09-05T08:00:29.000Z' });

describe('DesignationOperateur', () => {
  let designation: DesignationOperateur;
  beforeEach(() => {
    designation = new DesignationOperateur();
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

  const givenDesignatedOperator = (): void => {
    whenEntering('049', 0);
    whenResolving(whenValidating(0), 0);
  };
  const whenEntering = (code: string, now: number): void => {
    for (const digit of code) designation.enterDigit(digit, now);
  };
  const whenValidating = (now: number): DesignationResolution => {
    const resolution = designation.beginResolution(now);
    if (resolution === undefined) throw new Error('Expected a designation resolution');
    return resolution;
  };
  const whenResolving = (resolution: DesignationResolution, now: number): void => {
    designation.openWindow('atelier', referenceFixture, resolution.code, now);
    const accepted = designation.completeResolution(resolution, now);
    if (!accepted) designation.releaseWindow();
    designation.endResolution();
  };
  const whenFailingResolution = (resolution: DesignationResolution, now: number): void => {
    designation.failResolution(resolution, now);
    designation.endResolution();
  };
  const whenCheckingExpiration = (now: number): void => {
    designation.expire(now);
  };
  const whenPreparingPointage = (now: number): (() => LocalGeste[]) =>
    designation.requireWindow(now).preparePointage({ suiviId: 'piece', type: 'DEBUT' }, identityFixture);
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
  const thenPreparedPointageBelongsToJean = (capture: () => LocalGeste[]): void => {
    expect(capture()).toContainEqual({
      ...identityFixture(),
      suiviId: 'piece',
      type: 'DEBUT',
      operateurId: 'jean',
      nature: 'POINTAGE',
    });
  };
});
