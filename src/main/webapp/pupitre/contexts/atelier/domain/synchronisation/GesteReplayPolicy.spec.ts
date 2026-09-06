import { EvenementDuJournal, GesteDAtelier } from '../journal-du-pupitre/JournalDuPupitre';
import { CodeDeRefusDAtelier, RefusDAtelier } from '../refus/RefusDAtelier';
import { RefusDePublication } from '../refus/RefusDePublication';
import { decideReplay, OperationDAtelier, operationFor, ReplayDecision } from './GesteReplayPolicy';

const refusFixtures = [
  ['online', (code: CodeDeRefusDAtelier) => new RefusDAtelier(code, 'cause')],
  ['offline', (code: CodeDeRefusDAtelier) => new RefusDePublication('diagnostic externe', 'cause', code)],
] as const;

const scenarios: [OperationDAtelier, CodeDeRefusDAtelier, 'INITIALE' | 'REJEU', ReplayDecision][] = [
  ['ARRIVEE_ASSUREE', 'journee-de-travail-deja-ouverte', 'INITIALE', 'ACCEPTER'],
  ['ARRIVEE_ASSUREE', 'journee-de-travail-deja-ouverte', 'REJEU', 'ACCEPTER'],
  ['ARRIVEE_ASSUREE', 'transition-de-presence-interdite', 'INITIALE', 'PROPAGER'],
  ['PRESENCE_ASSUREE', 'transition-de-presence-interdite', 'INITIALE', 'ACCEPTER'],
  ['PRESENCE_ASSUREE', 'transition-de-presence-interdite', 'REJEU', 'ACCEPTER'],
  ['PRESENCE_ASSUREE', 'journee-de-travail-deja-ouverte', 'INITIALE', 'PROPAGER'],
  ['REPRISE_APRES_ARRIVEE_OUVERTE', 'transition-de-presence-interdite', 'INITIALE', 'ACCEPTER'],
  ['REPRISE_APRES_ARRIVEE_OUVERTE', 'transition-de-presence-interdite', 'REJEU', 'ACCEPTER'],
  ['GESTE_EXPLICITE', 'transition-de-presence-interdite', 'INITIALE', 'PROPAGER'],
  ['GESTE_EXPLICITE', 'suivi-d-atelier-cloture', 'INITIALE', 'PROPAGER'],
  ['GESTE_EXPLICITE', 'saisie-concurrente', 'INITIALE', 'RELIRE_ET_REJOUER'],
  ['GESTE_EXPLICITE', 'saisie-concurrente', 'REJEU', 'PROPAGER'],
];

describe.each(refusFixtures)('GesteReplayPolicy for %s refusals', (_name, refusalFixture) => {
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

describe('GesteReplayPolicy', () => {
  it('should absorb an explicit resumption refusal after its correlated arrival actually opened the day', () => {
    const arrivee: GesteDAtelier = { nature: 'ARRIVEE', id: 'arrivee', dateDeSurvenue: 'date', operateurId: 'jean' };
    const reprise: GesteDAtelier = {
      nature: 'PRESENCE',
      id: 'reprise',
      dateDeSurvenue: 'date',
      operateurId: 'jean',
      type: 'REPRISE',
      implicite: false,
      assuranceArriveeId: arrivee.id,
    };
    const journal: readonly EvenementDuJournal[] = [{ geste: arrivee, etat: 'ACCEPTE', journeeOuverte: true }];

    const operation = operationFor(reprise, journal);
    const decision = decideReplay(operation, new RefusDAtelier('transition-de-presence-interdite', 'cause'));

    expect(operation).toBe('REPRISE_APRES_ARRIVEE_OUVERTE');
    thenDecisionIs(decision, 'ACCEPTER');
  });

  it('should propagate an explicit resumption refusal when arrival assurance found an already open day', () => {
    const arrivee: GesteDAtelier = { nature: 'ARRIVEE', id: 'arrivee', dateDeSurvenue: 'date', operateurId: 'jean' };
    const reprise: GesteDAtelier = {
      nature: 'PRESENCE',
      id: 'reprise',
      dateDeSurvenue: 'date',
      operateurId: 'jean',
      type: 'REPRISE',
      implicite: false,
      assuranceArriveeId: arrivee.id,
    };
    const journal: readonly EvenementDuJournal[] = [{ geste: arrivee, etat: 'ACCEPTE', journeeOuverte: false }];

    const operation = operationFor(reprise, journal);
    const decision = decideReplay(operation, new RefusDAtelier('transition-de-presence-interdite', 'cause'));

    expect(operation).toBe('GESTE_EXPLICITE');
    thenDecisionIs(decision, 'PROPAGER');
  });

  it('should recognize the correlated arrival among unrelated journal events', () => {
    const arrivee: GesteDAtelier = { nature: 'ARRIVEE', id: 'arrivee', dateDeSurvenue: 'date', operateurId: 'jean' };
    const autreArrivee: GesteDAtelier = { ...arrivee, id: 'autre-arrivee' };
    const reprise: GesteDAtelier = {
      nature: 'PRESENCE',
      id: 'reprise',
      dateDeSurvenue: 'date',
      operateurId: 'jean',
      type: 'REPRISE',
      implicite: false,
      assuranceArriveeId: arrivee.id,
    };
    const journal: readonly EvenementDuJournal[] = [
      { geste: autreArrivee, etat: 'ACCEPTE', journeeOuverte: true },
      { geste: arrivee, etat: 'ACCEPTE', journeeOuverte: true },
    ];

    const operation = operationFor(reprise, journal);

    thenOperationIs(operation, 'REPRISE_APRES_ARRIVEE_OUVERTE');
  });

  it.each([
    ['another arrival', { nature: 'ARRIVEE', id: 'autre-arrivee', dateDeSurvenue: 'date', operateurId: 'jean' }],
    ['another operator arrival', { nature: 'ARRIVEE', id: 'arrivee', dateDeSurvenue: 'date', operateurId: 'marie' }],
  ] satisfies readonly [string, GesteDAtelier][])('should ignore %s when correlating an assured arrival', (_name, unrelatedArrival) => {
    const reprise: GesteDAtelier = {
      nature: 'PRESENCE',
      id: 'reprise',
      dateDeSurvenue: 'date',
      operateurId: 'jean',
      type: 'REPRISE',
      implicite: false,
      assuranceArriveeId: 'arrivee',
    };
    const journal: readonly EvenementDuJournal[] = [{ geste: unrelatedArrival, etat: 'ACCEPTE', journeeOuverte: true }];

    const operation = operationFor(reprise, journal);

    thenOperationIs(operation, 'GESTE_EXPLICITE');
  });

  it.each([
    new Error('network'),
    new RefusDePublication('refus autre contexte', 'autre contexte'),
    new RefusDePublication('refus inconnu', 'nouvelle cause'),
  ])('should propagate failures that have no contextual exception (%s)', failure => {
    const decision = whenDecidingReplay('ARRIVEE_ASSUREE', failure);

    thenDecisionIs(decision, 'PROPAGER');
  });

  it.each<[GesteDAtelier, OperationDAtelier]>([
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
  refusalFixture: (code: CodeDeRefusDAtelier) => RefusDAtelier | RefusDePublication,
  code: CodeDeRefusDAtelier,
): RefusDAtelier | RefusDePublication => refusalFixture(code);

const whenDecidingReplay = (operation: OperationDAtelier, failure: unknown, attempt?: 'INITIALE' | 'REJEU'): ReplayDecision => {
  if (attempt === undefined) {
    return decideReplay(operation, failure);
  }
  return decideReplay(operation, failure, attempt);
};

const whenIdentifyingTheGesture = (geste: GesteDAtelier): OperationDAtelier => operationFor(geste);

const thenDecisionIs = (decision: ReplayDecision, expected: ReplayDecision): void => {
  expect(decision).toBe(expected);
};
const thenOperationIs = (operation: OperationDAtelier, expected: OperationDAtelier): void => {
  expect(operation).toBe(expected);
};
