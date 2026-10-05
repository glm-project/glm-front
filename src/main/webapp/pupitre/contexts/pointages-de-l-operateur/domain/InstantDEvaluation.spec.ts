import { InstantDEvaluation } from './InstantDEvaluation';

describe('InstantDEvaluation', () => {
  it.each([
    ['2026-10-08T12:00:00.000Z', true],
    ['2026-10-08T14:00:00+02:00', true],
    ['2026-10-08T12:00:01Z', false],
  ])('should compare %s with noon UTC as an absolute instant', (autre, attendu) => {
    const memeInstant = new InstantDEvaluation('2026-10-08T12:00:00Z').estLeMeme(new InstantDEvaluation(autre));

    expect(memeInstant).toBe(attendu);
  });

  it.each(['2026-10-08T12:00:00', '2026-10-08', '2026-13-08T12:00:00Z'])('should refuse %s', instant => {
    const construction = (): InstantDEvaluation => new InstantDEvaluation(instant);

    expect(construction).toThrow(`L’instant « ${instant} » reçu du serveur n’est pas un instant absolu.`);
  });
});
