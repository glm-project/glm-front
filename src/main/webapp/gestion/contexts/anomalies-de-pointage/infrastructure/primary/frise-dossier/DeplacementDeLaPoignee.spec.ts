import { BornesDeLaFin } from '../../../domain/regularisation/CadreDeLaFin';
import { instantDeplace } from './DeplacementDeLaPoignee';
import { DemandeDeDeplacement } from './PoigneeDeFrise';

const instantAt = (heure: string, secondes = 0, fraction = 0): string => {
  const [heures = 0, minutes = 0] = heure.split(':').map(Number);
  return new Date(2026, 8, 14, heures, minutes, secondes, fraction).toISOString();
};

const BORNES: BornesDeLaFin = { min: instantAt('08:00'), max: instantAt('13:00') };

describe('Move of the handle of the proposed instant', () => {
  it.each<{ cas: string; demande: DemandeDeDeplacement; courant: string; expected: string }>([
    { cas: 'one minute forward', demande: { kind: 'DE', minutes: 1 }, courant: instantAt('10:00'), expected: '2026-09-14T10:01:00-03:00' },
    { cas: 'one minute back', demande: { kind: 'DE', minutes: -1 }, courant: instantAt('10:00'), expected: '2026-09-14T09:59:00-03:00' },
    {
      cas: 'a quarter of an hour forward',
      demande: { kind: 'DE', minutes: 15 },
      courant: instantAt('10:00'),
      expected: '2026-09-14T10:15:00-03:00',
    },
    {
      cas: 'from an instant with seconds, dropping them',
      demande: { kind: 'DE', minutes: 1 },
      courant: instantAt('10:00', 37),
      expected: '2026-09-14T10:01:00-03:00',
    },
    {
      cas: 'to an instant with seconds, dropping them',
      demande: { kind: 'VERS', instant: Date.parse(instantAt('10:00', 37)) },
      courant: instantAt('09:00'),
      expected: '2026-09-14T10:00:00-03:00',
    },
  ])('should move $cas', ({ demande, courant, expected }) => {
    expect(instantDeplace(demande, courant, BORNES)).toBe(expected);
  });

  it.each<{ cas: string; demande: DemandeDeDeplacement; courant: string; expected: string }>([
    {
      cas: 'after the upper bound',
      demande: { kind: 'DE', minutes: 15 },
      courant: instantAt('12:59'),
      expected: '2026-09-14T13:00:00-03:00',
    },
    {
      cas: 'before the lower bound',
      demande: { kind: 'DE', minutes: -15 },
      courant: instantAt('08:05'),
      expected: '2026-09-14T08:00:00-03:00',
    },
  ])('should not move the handle $cas', ({ demande, courant, expected }) => {
    expect(instantDeplace(demande, courant, BORNES)).toBe(expected);
  });

  it.each<{ cas: string; demande: DemandeDeDeplacement; courant: string; bornes: BornesDeLaFin; expected: string }>([
    {
      cas: 'the first whole minute after a lower bound that carries seconds',
      demande: { kind: 'BORNE', borne: 'MIN' },
      courant: instantAt('10:00'),
      bornes: { min: instantAt('08:00', 30), max: instantAt('13:00') },
      expected: '2026-09-14T08:01:00-03:00',
    },
    {
      cas: 'the first whole minute after a lower bound that carries only nanoseconds',
      demande: { kind: 'BORNE', borne: 'MIN' },
      courant: instantAt('10:00'),
      bornes: { min: '2026-09-14T11:00:00.000000500Z', max: instantAt('13:00') },
      expected: '2026-09-14T08:01:00-03:00',
    },
  ])('should go to $cas', ({ demande, courant, bornes, expected }) => {
    expect(instantDeplace(demande, courant, bornes)).toBe(expected);
  });

  it.each([
    { cas: 'within the bounds', instant: new Date(2026, 8, 14, 11, 30), expected: '2026-09-14T11:30:00-03:00' },
    { cas: 'before the lower bound', instant: new Date(2026, 8, 14, 7, 0), expected: '2026-09-14T08:00:00-03:00' },
    { cas: 'after the upper bound', instant: new Date(2026, 8, 14, 15, 0), expected: '2026-09-14T13:00:00-03:00' },
  ])('should take the instant under the pointer $cas', ({ instant, expected }) => {
    expect(instantDeplace({ kind: 'VERS', instant: instant.getTime() }, instantAt('10:00'), BORNES)).toBe(expected);
  });

  it('should keep the handle where it stands when the bounds leave no whole minute', () => {
    const bornes = { min: instantAt('13:00'), max: instantAt('12:59') };

    expect(instantDeplace({ kind: 'DE', minutes: 1 }, instantAt('12:59', 40), bornes)).toBe('2026-09-14T12:59:40-03:00');
  });

  it('should go to the lower bound on the origin request', () => {
    expect(instantDeplace({ kind: 'BORNE', borne: 'MIN' }, instantAt('10:00'), BORNES)).toBe('2026-09-14T08:00:00-03:00');
  });
});
