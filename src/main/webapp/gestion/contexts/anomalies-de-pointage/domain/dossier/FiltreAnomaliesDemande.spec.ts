import { filtreAnomaliesDemande } from './FiltreAnomaliesDemande';

const parametres = (valeurs: Record<string, string>) => ({ get: (nom: string): string | null => valeurs[nom] ?? null });

describe('Filter of the anomalies asked for by an address', () => {
  it('should read the nature, the operator, the element and the page of the address', () => {
    const filtre = filtreAnomaliesDemande(parametres({ nature: 'CONFLIT', operateur: 'op-1', element: 'el-1', page: '3' }));

    expect(filtre).toEqual({ nature: 'CONFLIT', operateur: 'op-1', element: 'el-1', page: 3 });
  });

  it('should ask for the automatic ends, without operator nor element, on the first page when the address names nothing', () => {
    const filtre = filtreAnomaliesDemande(parametres({}));

    expect(filtre).toEqual({ nature: 'FIN_AUTOMATIQUE', operateur: '', element: '', page: 1 });
  });

  it.each([
    { cas: 'an unknown nature', valeurs: { nature: 'AUTRE' }, attendu: { nature: 'FIN_AUTOMATIQUE', page: 1 } },
    { cas: 'an invalid page', valeurs: { page: '0' }, attendu: { nature: 'FIN_AUTOMATIQUE', page: 1 } },
  ])('should fall back on the defaults when the address holds $cas', ({ valeurs, attendu }) => {
    expect(filtreAnomaliesDemande(parametres(valeurs))).toMatchObject(attendu);
  });
});
