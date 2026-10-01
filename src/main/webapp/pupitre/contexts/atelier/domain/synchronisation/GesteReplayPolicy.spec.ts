import { CodeDeRefusDAtelier, MotifDeRefus } from '../refus/MotifDeRefus';
import { RefusDAtelier } from '../refus/RefusDAtelier';
import { RefusDePublication } from '../refus/RefusDePublication';
import { decideReplay, ReplayDecision } from './GesteReplayPolicy';

const refusFixtures = [
  ['online', (code: CodeDeRefusDAtelier) => new RefusDAtelier(code, 'cause')],
  ['offline', (code: CodeDeRefusDAtelier) => new RefusDePublication('diagnostic externe', 'cause', MotifDeRefus.from(code))],
] as const;

const scenarios: [CodeDeRefusDAtelier, 'INITIALE' | 'REJEU', ReplayDecision][] = [
  ['suivi-d-atelier-cloture', 'INITIALE', 'PROPAGER'],
  ['saisie-concurrente', 'INITIALE', 'RELIRE_ET_REJOUER'],
  ['saisie-concurrente', 'REJEU', 'PROPAGER'],
];

describe.each(refusFixtures)('GesteReplayPolicy for %s refusals', (_name, refusalFixture) => {
  it.each(scenarios)('should decide facing %s after retry=%s as %s', (code, tentative, expected) => {
    const refus = givenARefusal(refusalFixture, code);

    const decision = whenDecidingReplay(refus, tentative);

    thenDecisionIs(decision, expected);
  });

  it('should reread and replay a concurrent initial attempt by default', () => {
    const refus = givenARefusal(refusalFixture, 'saisie-concurrente');

    const decision = whenDecidingReplay(refus);

    thenDecisionIs(decision, 'RELIRE_ET_REJOUER');
  });
});

describe('GesteReplayPolicy', () => {
  it.each([
    new Error('network'),
    new RefusDePublication('refus autre contexte', 'autre contexte'),
    new RefusDePublication('refus inconnu', 'nouvelle cause'),
  ])('should propagate failures that have no contextual exception (%s)', failure => {
    const decision = whenDecidingReplay(failure);

    thenDecisionIs(decision, 'PROPAGER');
  });
});

const givenARefusal = (
  refusalFixture: (code: CodeDeRefusDAtelier) => RefusDAtelier | RefusDePublication,
  code: CodeDeRefusDAtelier,
): RefusDAtelier | RefusDePublication => refusalFixture(code);

const whenDecidingReplay = (failure: unknown, attempt?: 'INITIALE' | 'REJEU'): ReplayDecision => decideReplay(failure, attempt);

const thenDecisionIs = (decision: ReplayDecision, expected: ReplayDecision): void => {
  expect(decision).toBe(expected);
};
