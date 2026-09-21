import { Montant } from './Montant';

describe('Montant', () => {
  it('should read the euros the server sent', () => {
    const montant = new Montant(130.45);

    expect(montant.euros).toBe(130.45);
  });

  it('should accept a cost of zero, which a pointing without a work station produces', () => {
    const montant = new Montant(0);

    expect(montant.euros).toBe(0);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -0.01])(
    'should refuse %p, which is not an amount in euros',
    valeur => {
      expect(() => new Montant(valeur)).toThrow(`Le montant « ${String(valeur)} » reçu du serveur n’est pas un montant en euros.`);
    },
  );

  it('should tell why an amount is refused without building it', () => {
    expect(Montant.erreur(-1)).toBe('Le montant « -1 » reçu du serveur n’est pas un montant en euros.');
  });

  it('should tell nothing about an amount it accepts', () => {
    expect(Montant.erreur(12.5)).toBeUndefined();
  });
});
