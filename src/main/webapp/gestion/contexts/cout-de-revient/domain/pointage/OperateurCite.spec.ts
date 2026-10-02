import { OperateurCite } from './OperateurCite';

describe('OperateurCite', () => {
  it('should tell an operator the referential named', () => {
    expect(new OperateurCite('operateur-1', 'Julien', 'Martin').estNomme()).toBe(true);
  });

  it('should tell an operator the referential no longer knows', () => {
    expect(new OperateurCite('operateur-1', undefined, undefined).estNomme()).toBe(false);
  });
});
