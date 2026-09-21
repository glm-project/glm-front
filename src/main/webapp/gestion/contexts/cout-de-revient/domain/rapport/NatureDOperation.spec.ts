import { NatureDOperation } from './NatureDOperation';

describe('NatureDOperation', () => {
  it('should carry the trade the work station named', () => {
    expect(new NatureDOperation('Fraisage').value).toBe('Fraisage');
  });

  it.each(['', '   '])('should refuse the empty nature %p, which names no trade', value => {
    expect(() => new NatureDOperation(value)).toThrow('La nature d’opération reçue du serveur est vide.');
  });
});
