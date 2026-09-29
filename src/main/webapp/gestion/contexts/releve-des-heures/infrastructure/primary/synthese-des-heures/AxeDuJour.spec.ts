import { InstantDeReleve } from '../../../domain/releve/InstantDeReleve';
import { AxeDuJour, minutesDeDebut, minutesDeFin, seLePoursuit } from './AxeDuJour';

const instantLocal = (jour: number, heure: number, minute: number): InstantDeReleve =>
  new InstantDeReleve(new Date(2026, 8, jour, heure, minute).toISOString());

const arrondi = (valeur: number): number => Math.round(valeur * 100) / 100;

const MINUTES_DES_HEURES_DE_JOUR = [6 * 60, 22 * 60] as const;

describe('AxeDuJour', () => {
  describe('window', () => {
    it.each([
      ['no bound', []],
      ['bounds inside the daytime hours', [8 * 60, 17 * 60 + 32]],
      ['bounds exactly on the daytime hours', MINUTES_DES_HEURES_DE_JOUR],
    ])('should keep the daytime hours for %s', (_cas, bornes) => {
      const axe = AxeDuJour.de(bornes);

      expect([axe.pourcentDe(6 * 60), axe.pourcentDe(22 * 60)]).toEqual([0, 100]);
    });

    it.each([
      ['a bound before the daytime hours', [5 * 60 + 30]],
      ['a bound after the daytime hours', [22 * 60 + 45]],
      ['a bound at midnight', [24 * 60]],
    ])('should open onto the whole day for %s', (_cas, bornes) => {
      const axe = AxeDuJour.de(bornes);

      expect([axe.pourcentDe(0), axe.pourcentDe(24 * 60)]).toEqual([0, 100]);
    });
  });

  describe('position of a minute', () => {
    it('should place a minute as a share of the daytime hours', () => {
      expect(arrondi(AxeDuJour.de([]).pourcentDe(8 * 60))).toBe(12.5);
    });

    it('should place a minute as a share of the whole day', () => {
      expect(arrondi(AxeDuJour.de([5 * 60 + 30]).pourcentDe(5 * 60 + 30))).toBe(22.92);
    });

    it('should place a minute past the daytime hours as a share of the whole day', () => {
      expect(arrondi(AxeDuJour.de([22 * 60 + 45]).pourcentDe(22 * 60 + 45))).toBe(94.79);
    });
  });

  describe('marks', () => {
    const resume = (axe: AxeDuJour, ouvert: boolean): (readonly [number, number, string])[] =>
      axe.reperes(ouvert).map(repere => [repere.minutes, arrondi(repere.gauche), repere.ancrage] as const);

    it('should mark 8 h and 20 h on a closed day of daytime hours, from its start to its end', () => {
      expect(resume(AxeDuJour.de([]), false)).toEqual([
        [8 * 60, 12.5, 'debut'],
        [20 * 60, 87.5, 'fin'],
      ]);
    });

    it('should mark 0 h and 24 h on a closed day opened onto the whole day', () => {
      expect(resume(AxeDuJour.de([5 * 60]), false)).toEqual([
        [0, 0, 'debut'],
        [24 * 60, 100, 'fin'],
      ]);
    });

    it('should mark every two hours on the open day of daytime hours, the ends anchored inward', () => {
      expect(resume(AxeDuJour.de([]), true).map(([minutes, , ancrage]) => [minutes / 60, ancrage])).toEqual([
        [6, 'debut'],
        [8, 'centre'],
        [10, 'centre'],
        [12, 'centre'],
        [14, 'centre'],
        [16, 'centre'],
        [18, 'centre'],
        [20, 'centre'],
        [22, 'fin'],
      ]);
    });

    it('should mark every three hours on the open day opened onto the whole day', () => {
      expect(resume(AxeDuJour.de([5 * 60]), true).map(([minutes]) => minutes / 60)).toEqual([0, 3, 6, 9, 12, 15, 18, 21, 24]);
    });
  });

  describe('instants', () => {
    it('should read the minute of the day an instant begins at', () => {
      expect(minutesDeDebut(instantLocal(14, 8, 2))).toBe(8 * 60 + 2);
    });

    it('should read the minute of the day an instant ends at, on the day it began', () => {
      expect(minutesDeFin(instantLocal(14, 8, 2), instantLocal(14, 12, 0))).toBe(12 * 60);
    });

    it('should end at the end of the day an instant of the day after ends, the day being cut at midnight', () => {
      expect(minutesDeFin(instantLocal(14, 19, 0), instantLocal(15, 0, 0))).toBe(24 * 60);
    });

    it('should go on the next day when it ends on another day', () => {
      expect(seLePoursuit(instantLocal(14, 19, 0), instantLocal(15, 0, 0))).toBe(true);
    });

    it('should not go on the next day when it ends on the same day', () => {
      expect(seLePoursuit(instantLocal(14, 8, 0), instantLocal(14, 12, 0))).toBe(false);
    });
  });
});
