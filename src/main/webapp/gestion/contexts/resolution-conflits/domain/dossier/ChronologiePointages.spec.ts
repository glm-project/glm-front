import { ChronologiePointages } from './ChronologiePointages';
import { PointageConflit } from './DossierConflit';
import { PointageConflitId } from './PointageConflitId';

describe('ChronologiePointages', () => {
  it('should place facts in their effective order when they were received out of order', () => {
    const journal = [pointageFixture('fin', '2026-09-14T17:00:00Z'), pointageFixture('debut', '2026-09-14T08:00:00Z')];

    const chronologie = new ChronologiePointages(journal);

    expect(chronologie.pointages.map(pointage => pointage.id.pointage)).toEqual(['debut', 'fin']);
  });

  it('should preserve nanosecond ordering within the same millisecond', () => {
    const journal = [pointageFixture('fin', '2026-09-14T08:00:00.123456789Z'), pointageFixture('debut', '2026-09-14T08:00:00.123456788Z')];

    const chronologie = new ChronologiePointages(journal);

    expect(chronologie.pointages.map(pointage => pointage.id.pointage)).toEqual(['debut', 'fin']);
    expect(chronologie.pointages.map(pointage => pointage.fait.instant)).toEqual([
      '2026-09-14T08:00:00.123456788Z',
      '2026-09-14T08:00:00.123456789Z',
    ]);
  });

  it('should compare effective instants across different offsets and calendar dates', () => {
    const journal = [pointageFixture('fin', '2026-09-14T23:00:00Z'), pointageFixture('debut', '2026-09-15T00:30:00+02:00')];

    const chronologie = new ChronologiePointages(journal);

    expect(chronologie.pointages.map(pointage => pointage.id.pointage)).toEqual(['debut', 'fin']);
    expect(chronologie.pointages.map(pointage => pointage.fait.instant)).toEqual(['2026-09-15T00:30:00+02:00', '2026-09-14T23:00:00Z']);
  });

  it('should retain nanosecond ordering when matching UTC milliseconds use different offsets', () => {
    const journal = [
      pointageFixture('fin', '2026-09-14T05:00:00.123456789-03:00'),
      pointageFixture('debut', '2026-09-14T10:00:00.123456788+02:00'),
    ];

    const chronologie = new ChronologiePointages(journal);

    expect(chronologie.pointages.map(pointage => pointage.id.pointage)).toEqual(['debut', 'fin']);
  });

  it.each([
    {
      description: 'different offsets including minutes',
      first: '2026-09-14T04:45:00.123456789-03:15',
      second: '2026-09-14T10:40:00.123456789+02:40',
    },
    {
      description: 'different fractional precision',
      first: '2026-09-14T08:00:00.12Z',
      second: '2026-09-14T08:00:00.120000000+00:00',
    },
    {
      description: 'shorter fractional precision received last',
      first: '2026-09-14T08:00:00.120000000+00:00',
      second: '2026-09-14T08:00:00.12Z',
    },
    {
      description: 'whole seconds and zero nanoseconds',
      first: '2026-09-14T08:00:00Z',
      second: '2026-09-14T08:00:00.000000000Z',
    },
  ])('should keep received order for equal instants expressed with $description', ({ first, second }) => {
    const journal = [pointageFixture('fin', first), pointageFixture('debut', second)];

    const chronologie = new ChronologiePointages(journal);

    expect(chronologie.pointages).toEqual(journal);
  });

  it('should keep the original journal unchanged while presenting its chronology', () => {
    const journal = Object.freeze([pointageFixture('fin', '2026-09-14T17:00:00Z'), pointageFixture('debut', '2026-09-14T08:00:00Z')]);

    const chronologie = new ChronologiePointages(journal);

    expect(journal.map(pointage => pointage.id.pointage)).toEqual(['fin', 'debut']);
    expect(chronologie.pointages.map(pointage => pointage.id.pointage)).toEqual(['debut', 'fin']);
  });
});

const pointageFixture = (id: string, instant: string): PointageConflit => ({
  id: new PointageConflitId(id),
  fait: {
    type: 'DEBUT',
    intention: 'OUVERTURE',
    activiteVisee: 'travail',
    operateur: 'camille',
    poste: 'fraiseuse',
    instant,
  },
  auteur: 'Camille Martin',
  enregistre: '2026-09-15T10:00:00Z',
  regularisation: false,
});
