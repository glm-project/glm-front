import { InstantDeLaJournee } from './InstantDeLaJournee';

describe('InstantDeLaJournee', () => {
  it.each([
    { cas: 'in UTC', recu: '2026-10-04T22:00:00Z', absolu: '2026-10-04T22:00:00.000Z' },
    { cas: 'with an explicit offset', recu: '2026-10-05T00:00:00+02:00', absolu: '2026-10-04T22:00:00.000Z' },
  ])('should read the instant received $cas as an absolute instant', ({ recu, absolu }) => {
    expect(new InstantDeLaJournee(recu).value.toISOString()).toBe(absolu);
  });

  it.each([
    { cas: 'without an offset', recu: '2026-10-05T00:00:00' },
    { cas: 'a day without a time', recu: '2026-10-05' },
    { cas: 'a date that does not exist', recu: '2026-02-30T00:00:00Z' },
    { cas: 'free text', recu: 'minuit' },
    { cas: 'text before the instant', recu: 'le 2026-10-05T00:00:00Z' },
    { cas: 'text after the instant', recu: '2026-10-05T00:00:00Z minuit' },
  ])('should refuse $cas', ({ recu }) => {
    expect(() => new InstantDeLaJournee(recu)).toThrow('L’instant reçu du serveur n’est pas un instant absolu.');
  });
});
