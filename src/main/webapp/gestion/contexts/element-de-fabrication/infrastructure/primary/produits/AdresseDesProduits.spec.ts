import { convertToParamMap } from '@angular/router';
import { CategorieDeProduit } from '../../../domain/CategorieDeProduit';
import { RequeteProduits } from '../../../domain/RequeteProduits';
import { adresseDeLaRequete, requeteDeLAdresse } from './AdresseDesProduits';

describe('AdresseDesProduits', () => {
  it('should open on the products in the workshop, first page, without filter', () => {
    expect(requeteDeLAdresse(convertToParamMap({}))).toEqual(
      new RequeteProduits({ cycle: 'EN_ATELIER', categorie: undefined, recherche: '', page: 0 }),
    );
  });

  it.each([
    ['en-preparation', 'EN_PREPARATION'],
    ['en-atelier', 'EN_ATELIER'],
    ['clotures', 'CLOTURE'],
    ['inconnu', 'EN_ATELIER'],
  ] as const)('should read the tab %s as the %s cycle', (etat, cycle) => {
    expect(requeteDeLAdresse(convertToParamMap({ etat })).cycle).toBe(cycle);
  });

  it('should read the category, the search and the page counted from one', () => {
    expect(requeteDeLAdresse(convertToParamMap({ etat: 'clotures', categorie: 'MOULE', recherche: 'capot', page: '3' }))).toEqual(
      new RequeteProduits({ cycle: 'CLOTURE', categorie: new CategorieDeProduit('MOULE'), recherche: 'capot', page: 2 }),
    );
  });

  it.each([['moule'], ['M0ULE']])('should ignore the invalid category %s', categorie => {
    expect(requeteDeLAdresse(convertToParamMap({ categorie })).categorie).toBeUndefined();
  });

  it.each([['0'], ['-2'], ['1.5'], ['deux']])('should read the invalid page %s as the first one', page => {
    expect(requeteDeLAdresse(convertToParamMap({ page })).page).toBe(0);
  });

  it.each([
    [{ periode: 'ce-mois' }, { prereglage: 'CE_MOIS' }],
    [{ periode: '3-mois' }, { prereglage: 'TROIS_MOIS' }],
    [{ periode: '12-mois' }, { prereglage: 'DOUZE_MOIS' }],
    [{ periode: 'inconnue' }, { prereglage: 'DOUZE_MOIS' }],
    [
      { du: '2026-03-01', au: '2026-03-31' },
      { du: '2026-03-01', au: '2026-03-31' },
    ],
    [{ du: '2026-03-01' }, { prereglage: 'DOUZE_MOIS' }],
    [{ du: '2026-02-30', au: '2026-03-31', periode: 'ce-mois' }, { prereglage: 'CE_MOIS' }],
  ])('should read the closure period of %j', (parametres, cloture) => {
    expect(requeteDeLAdresse(convertToParamMap({ etat: 'clotures', ...parametres })).cloture).toEqual(cloture);
  });

  it.each([
    [{ prereglage: 'CE_MOIS' }, { etat: 'clotures', periode: 'ce-mois' }],
    [{ prereglage: 'TROIS_MOIS' }, { etat: 'clotures', periode: '3-mois' }],
    [{ prereglage: 'DOUZE_MOIS' }, { etat: 'clotures' }],
    [
      { du: '2026-03-01', au: '2026-03-31' },
      { etat: 'clotures', du: '2026-03-01', au: '2026-03-31' },
    ],
  ] as const)('should write the closure period %j', (cloture, adresse) => {
    expect(adresseDeLaRequete(new RequeteProduits({ cycle: 'CLOTURE', categorie: undefined, recherche: '', page: 0, cloture }))).toEqual(
      adresse,
    );
  });

  it('should leave the closure period out of the other tabs', () => {
    expect(
      adresseDeLaRequete(
        new RequeteProduits({ cycle: 'EN_ATELIER', categorie: undefined, recherche: '', page: 0, cloture: { prereglage: 'CE_MOIS' } }),
      ),
    ).toEqual({ etat: 'en-atelier' });
  });

  it('should write only what differs from an unfiltered first page', () => {
    expect(adresseDeLaRequete(new RequeteProduits({ cycle: 'EN_ATELIER', categorie: undefined, recherche: '', page: 0 }))).toEqual({
      etat: 'en-atelier',
    });
  });

  it('should write every criterion, the page counted from one', () => {
    expect(
      adresseDeLaRequete(
        new RequeteProduits({ cycle: 'EN_PREPARATION', categorie: new CategorieDeProduit('OF'), recherche: 'capot', page: 1 }),
      ),
    ).toEqual({ etat: 'en-preparation', categorie: 'OF', recherche: 'capot', page: 2 });
  });
});
