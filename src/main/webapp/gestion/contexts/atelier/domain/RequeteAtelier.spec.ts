import { RequeteAtelier } from './RequeteAtelier';

describe('RequeteAtelier', () => {
  it('should read what is at the workshop as the three states that are not closed', () => {
    const requete = new RequeteAtelier(0, 20, 'ACTIFS');

    expect(requete.etats()).toEqual(['EN_ATTENTE', 'EN_COURS', 'INTERROMPU']);
  });

  it('should read closed elements as the closed state alone', () => {
    const requete = new RequeteAtelier(0, 20, 'CLOTURES');

    expect(requete.etats()).toEqual(['CLOTURE']);
  });

  it('should keep the page it was asked for', () => {
    const requete = new RequeteAtelier(2, 50, 'ACTIFS');

    expect(requete.page).toBe(2);
    expect(requete.taille).toBe(50);
    expect(requete.filtre).toBe('ACTIFS');
  });

  it.each([-1, 1.5])('should refuse an invalid page: %s', page => {
    expect(() => new RequeteAtelier(page, 20, 'ACTIFS')).toThrow('Le numéro de page doit être un entier positif ou nul.');
  });

  it.each([0, -5, 2.5])('should refuse an invalid size: %s', taille => {
    expect(() => new RequeteAtelier(0, taille, 'ACTIFS')).toThrow('La taille de page doit être un entier strictement positif.');
  });
});
