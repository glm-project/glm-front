import { LocalGeste } from './LocalPupitreState';
import { decideReplay, OperationDAtelier, operationFor, ReplayDecision } from './PupitreReplayPolicy';
import { CodeDeRefusDAtelier, RefusDAtelier } from './RefusDAtelier';
import { RefusDuPupitre } from './RefusDuPupitre';

const refusFixtures = [
  ['online', (code: CodeDeRefusDAtelier) => new RefusDAtelier(code, 'cause')],
  ['offline', (code: CodeDeRefusDAtelier) => new RefusDuPupitre('diagnostic externe', 'cause', code)],
] as const;

const scenarios: [OperationDAtelier, CodeDeRefusDAtelier, 'INITIALE' | 'REJEU', ReplayDecision][] = [
  ['ARRIVEE_ASSUREE', 'journee-de-travail-deja-ouverte', 'INITIALE', 'ACCEPTER'],
  ['ARRIVEE_ASSUREE', 'journee-de-travail-deja-ouverte', 'REJEU', 'ACCEPTER'],
  ['ARRIVEE_ASSUREE', 'transition-de-presence-interdite', 'INITIALE', 'PROPAGER'],
  ['PRESENCE_ASSUREE', 'transition-de-presence-interdite', 'INITIALE', 'ACCEPTER'],
  ['PRESENCE_ASSUREE', 'transition-de-presence-interdite', 'REJEU', 'ACCEPTER'],
  ['PRESENCE_ASSUREE', 'journee-de-travail-deja-ouverte', 'INITIALE', 'PROPAGER'],
  ['GESTE_EXPLICITE', 'transition-de-presence-interdite', 'INITIALE', 'PROPAGER'],
  ['GESTE_EXPLICITE', 'suivi-d-atelier-cloture', 'INITIALE', 'PROPAGER'],
  ['GESTE_EXPLICITE', 'saisie-concurrente', 'INITIALE', 'RELIRE_ET_REJOUER'],
  ['GESTE_EXPLICITE', 'saisie-concurrente', 'REJEU', 'PROPAGER'],
];

describe.each(refusFixtures)('PupitreReplayPolicy for %s refusals', (_name, refusalFixture) => {
  it.each(scenarios)('should decide %s facing %s after retry=%s as %s', (operation, code, tentative, expected) => {
    const refus = givenARefusal(refusalFixture, code);

    const decision = whenDecidingReplay(operation, refus, tentative);

    thenDecisionIs(decision, expected);
  });

  it('should reread and replay a concurrent initial attempt by default', () => {
    const refus = givenARefusal(refusalFixture, 'saisie-concurrente');

    const decision = whenDecidingReplay('GESTE_EXPLICITE', refus);

    thenDecisionIs(decision, 'RELIRE_ET_REJOUER');
  });
});

describe('PupitreReplayPolicy', () => {
  it.each([
    new Error('network'),
    new RefusDuPupitre('refus autre contexte', 'autre contexte'),
    new RefusDuPupitre('refus inconnu', 'nouvelle cause'),
  ])('should propagate failures that have no contextual exception (%s)', failure => {
    const decision = whenDecidingReplay('ARRIVEE_ASSUREE', failure);

    thenDecisionIs(decision, 'PROPAGER');
  });

  it.each<[LocalGeste, OperationDAtelier]>([
    [{ nature: 'ARRIVEE', id: '1', dateDeSurvenue: 'date', operateurId: 'jean' }, 'ARRIVEE_ASSUREE'],
    [{ nature: 'PRESENCE', id: '2', dateDeSurvenue: 'date', operateurId: 'jean', type: 'REPRISE', implicite: true }, 'PRESENCE_ASSUREE'],
    [{ nature: 'PRESENCE', id: '3', dateDeSurvenue: 'date', operateurId: 'jean', type: 'REPRISE', implicite: false }, 'GESTE_EXPLICITE'],
    [{ nature: 'POINTAGE', id: '4', dateDeSurvenue: 'date', operateurId: 'jean', suiviId: 'piece', type: 'DEBUT' }, 'GESTE_EXPLICITE'],
  ])('should identify the intent of gesture %j', (geste, expected) => {
    const operation = whenIdentifyingTheGesture(geste);

    thenOperationIs(operation, expected);
  });
});

const givenARefusal = (
  refusalFixture: (code: CodeDeRefusDAtelier) => RefusDAtelier | RefusDuPupitre,
  code: CodeDeRefusDAtelier,
): RefusDAtelier | RefusDuPupitre => refusalFixture(code);

const whenDecidingReplay = (operation: OperationDAtelier, failure: unknown, attempt?: 'INITIALE' | 'REJEU'): ReplayDecision => {
  if (attempt === undefined) {
    return decideReplay(operation, failure);
  }
  return decideReplay(operation, failure, attempt);
};

const whenIdentifyingTheGesture = (geste: LocalGeste): OperationDAtelier => operationFor(geste);

const thenDecisionIs = (decision: ReplayDecision, expected: ReplayDecision): void => {
  expect(decision).toBe(expected);
};
const thenOperationIs = (operation: OperationDAtelier, expected: OperationDAtelier): void => {
  expect(operation).toBe(expected);
};
