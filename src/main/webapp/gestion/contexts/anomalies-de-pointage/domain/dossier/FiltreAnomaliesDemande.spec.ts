import { filtreAnomaliesDemande } from './FiltreAnomaliesDemande';

const parametres = (valeurs: Record<string, string>) => ({ get: (nom: string): string | null => valeurs[nom] ?? null });

describe('Filter of the anomalies asked for by an address', () => {
  it('should read the operator, the element and the page of the address', () => {
    const filtre = filtreAnomaliesDemande(parametres({ operateur: 'op-1', element: 'el-1', page: '3' }));

    expect(filtre).toEqual({ operateur: 'op-1', element: 'el-1', page: 3 });
  });

  it('should ask for no operator nor element, on the first page when the address names nothing', () => {
    const filtre = filtreAnomaliesDemande(parametres({}));

    expect(filtre).toEqual({ operateur: '', element: '', page: 1 });
  });

  it('should fall back on the first page when the address holds an invalid page', () => {
    expect(filtreAnomaliesDemande(parametres({ page: '0' })).page).toBe(1);
  });
});
