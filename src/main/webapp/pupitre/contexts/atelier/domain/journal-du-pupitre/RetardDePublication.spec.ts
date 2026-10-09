import { EvenementDuJournal, JournalDuPupitre } from './JournalDuPupitre';
import { RetardDePublication } from './RetardDePublication';

const INSTANT = Date.parse('2026-09-05T12:00:00Z');
const UNE_HEURE = 3_600_000;

describe('RetardDePublication', () => {
  it('should not signal any delay when no gesture is pending', () => {
    const journal = givenJournal([]);

    const retard = whenEvaluating(journal);

    thenNoDelayIsSignaled(retard);
  });

  it('should signal how long the pending gesture has waited', () => {
    const journal = givenJournal([enAttenteDepuis(2 * UNE_HEURE)]);

    const retard = whenEvaluating(journal);

    thenDelayIs(retard, { gestes: 1, depuis: 2 * UNE_HEURE });
  });

  it('should not signal a delay while the oldest pending gesture is younger than one hour', () => {
    const journal = givenJournal([enAttenteDepuis(UNE_HEURE - 1)]);

    const retard = whenEvaluating(journal);

    thenNoDelayIsSignaled(retard);
  });

  it('should signal a delay from exactly one hour', () => {
    const journal = givenJournal([enAttenteDepuis(UNE_HEURE)]);

    const retard = whenEvaluating(journal);

    thenDelayIs(retard, { gestes: 1, depuis: UNE_HEURE });
  });

  it('should count every pending gesture', () => {
    const journal = givenJournal([enAttenteDepuis(2 * UNE_HEURE, 'a'), enAttenteDepuis(90 * 60_000, 'b'), enAttenteDepuis(60_000, 'c')]);

    const retard = whenEvaluating(journal);

    thenDelayIs(retard, { gestes: 3, depuis: 2 * UNE_HEURE });
  });

  it('should measure the delay from the oldest pending gesture wherever it sits in the journal', () => {
    const journal = givenJournal([enAttenteDepuis(60_000, 'a'), enAttenteDepuis(3 * UNE_HEURE, 'b'), enAttenteDepuis(2 * UNE_HEURE, 'c')]);

    const retard = whenEvaluating(journal);

    thenDelayIs(retard, { gestes: 3, depuis: 3 * UNE_HEURE });
  });

  it.each([
    { etat: 'ACCEPTE' as const, sort: 'accepted' },
    { etat: 'REFUSE' as const, sort: 'refused' },
  ])('should ignore an old $sort gesture when judging the pending ones', ({ etat }) => {
    const journal = givenJournal([ancienneteSansAttente(etat, 5 * UNE_HEURE), enAttenteDepuis(60_000)]);

    const retard = whenEvaluating(journal);

    thenNoDelayIsSignaled(retard);
  });

  it('should not count accepted or refused gestures among the pending ones', () => {
    const journal = givenJournal([
      ancienneteSansAttente('ACCEPTE', 5 * UNE_HEURE),
      ancienneteSansAttente('REFUSE', 4 * UNE_HEURE),
      enAttenteDepuis(2 * UNE_HEURE),
    ]);

    const retard = whenEvaluating(journal);

    thenDelayIs(retard, { gestes: 1, depuis: 2 * UNE_HEURE });
  });

  const enAttenteDepuis = (ancienneteMs: number, id = 'geste'): EvenementDuJournal => ({
    etat: 'EN_ATTENTE',
    geste: {
      nature: 'POINTAGE',
      type: 'DEBUT',
      id,
      operateurId: 'jean',
      suiviId: 'piece',
      dateDeSurvenue: new Date(INSTANT - ancienneteMs).toISOString(),
    },
  });
  const ancienneteSansAttente = (etat: 'ACCEPTE' | 'REFUSE', ancienneteMs: number): EvenementDuJournal => {
    const { geste } = enAttenteDepuis(ancienneteMs, `${etat}-${String(ancienneteMs)}`);
    return etat === 'ACCEPTE' ? { geste, etat } : { geste, etat, refus: { code: 'INCONNU', message: 'Refus' } };
  };
  const givenJournal = (evenements: readonly EvenementDuJournal[]): JournalDuPupitre => ({ connecte: true, evenements });
  const whenEvaluating = (journal: JournalDuPupitre): RetardDePublication | undefined => RetardDePublication.of(journal, INSTANT);
  const thenNoDelayIsSignaled = (retard: RetardDePublication | undefined): void => {
    expect(retard).toBeUndefined();
  };
  const thenDelayIs = (retard: RetardDePublication | undefined, expected: { gestes: number; depuis: number }): void => {
    expect(retard).toEqual(expected);
  };
});
