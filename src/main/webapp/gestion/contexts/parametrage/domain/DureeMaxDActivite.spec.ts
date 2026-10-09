import { DureeMaxDActivite } from './DureeMaxDActivite';

describe('DureeMaxDActivite', () => {
  it.each([1, 13, 24])('should retain a whole number of hours between 1 and 24: %s', heures => {
    const duree = new DureeMaxDActivite(heures);

    expect(duree.heures).toBe(heures);
  });

  it.each([
    [0, 'La durée doit être d’au moins 1 h.'],
    [25, 'La durée ne peut pas dépasser 24 h.'],
    [10.5, 'Saisissez un nombre entier d’heures.'],
    [NaN, 'Saisissez un nombre entier d’heures.'],
  ])('should refuse %s hours', (heures, message) => {
    expect(() => new DureeMaxDActivite(heures)).toThrow(message);
  });

  it.each([
    [10, { heure: 18, lendemain: false }],
    [16, { heure: 0, lendemain: true }],
    [24, { heure: 8, lendemain: true }],
  ])('should tell when an activity started at 08:00 stops after %s hours', (heures, arret) => {
    const duree = new DureeMaxDActivite(heures);

    expect(duree.arretDUneActiviteCommenceeA(8)).toEqual(arret);
  });
});
