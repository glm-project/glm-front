import { decideRejeu, DecisionDeRejeu, OperationDAtelier, operationFor } from './PolitiqueDeRejeu';
import { GesteLocal } from './PupitreLocal';
import { CodeDeRefusDAtelier, RefusDAtelier } from './RefusDAtelier';
import { RefusDuPupitre } from './RefusDuPupitre';

const refusFixtures = [
  ['online', (code: CodeDeRefusDAtelier) => new RefusDAtelier(code, 'cause')],
  ['offline', (code: CodeDeRefusDAtelier) => new RefusDuPupitre('diagnostic externe', 'cause', code)],
] as const;

const scenarios: [OperationDAtelier, CodeDeRefusDAtelier, 'INITIALE' | 'REJEU', DecisionDeRejeu][] = [
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

describe.each(refusFixtures)('PolitiqueDeRejeu for %s refusals', (_name, refusalFixture) => {
  it.each(scenarios)('should decide %s facing %s after retry=%s as %s', (operation, code, tentative, expected) => {
    const refus = givenARefusal(refusalFixture, code);

    const decision = whenDecidingReplay(operation, refus, tentative);

    thenDecisionIs(decision, expected);
  });
});

describe('PolitiqueDeRejeu', () => {
  it.each([
    new Error('network'),
    new RefusDuPupitre('refus autre contexte', 'autre contexte'),
    new RefusDuPupitre('refus inconnu', 'nouvelle cause'),
  ])('should propagate failures that have no contextual exception (%s)', failure => {
    const decision = whenDecidingReplay('ARRIVEE_ASSUREE', failure);

    thenDecisionIs(decision, 'PROPAGER');
  });

  it.each<[GesteLocal, OperationDAtelier]>([
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

const whenDecidingReplay = (operation: OperationDAtelier, failure: unknown, attempt: 'INITIALE' | 'REJEU' = 'INITIALE'): DecisionDeRejeu =>
  decideRejeu(operation, failure, attempt);

const whenIdentifyingTheGesture = (geste: GesteLocal): OperationDAtelier => operationFor(geste);

const thenDecisionIs = (decision: DecisionDeRejeu, expected: DecisionDeRejeu): void => {
  expect(decision).toBe(expected);
};
const thenOperationIs = (operation: OperationDAtelier, expected: OperationDAtelier): void => {
  expect(operation).toBe(expected);
};
