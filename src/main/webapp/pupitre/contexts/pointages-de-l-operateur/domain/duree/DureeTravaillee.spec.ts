import { DureeTravaillee } from './DureeTravaillee';

describe('DureeTravaillee', () => {
  it.each([
    ['PT7H45M', 7, 45],
    ['PT90M', 1, 30],
    ['PT13H', 13, 0],
    ['PT1H2M59.9S', 1, 2],
    ['PT0S', 0, 0],
  ])('should read %s as %i h %i', (value, heures, minutesRestantes) => {
    const duree = new DureeTravaillee(value);

    expect(duree).toMatchObject({ heures, minutesRestantes });
  });

  it.each(['PT', 'P1D', '7h45', ''])('should refuse %s', value => {
    const construction = (): DureeTravaillee => new DureeTravaillee(value);

    expect(construction).toThrow(`La durée « ${value} » reçue du serveur n’est pas une durée de pointage.`);
  });
});
