import { OperateurId } from './OperateurId';

describe('OperateurId', () => {
  it.each(['', '  '])('should refuse an operator without identifier', value => {
    const construction = (): OperateurId => new OperateurId(value);

    expect(construction).toThrow('Un opérateur est désigné par un identifiant.');
  });
});
