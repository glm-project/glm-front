import { adresseDossier } from './AdresseDossier';

describe('Address of a dossier', () => {
  it('should hold the suivi and the pointage the route names', () => {
    const adresse = adresseDossier('suivi-camille', 'fin-17');

    expect(adresse?.suivi.suivi).toBe('suivi-camille');
    expect(adresse?.pointage.pointage).toBe('fin-17');
  });

  it('should be none when the route names no suivi', () => {
    expect(adresseDossier(null, 'fin-17')).toBeUndefined();
  });

  it('should be none when the route names no pointage', () => {
    expect(adresseDossier('suivi-camille', null)).toBeUndefined();
  });
});
