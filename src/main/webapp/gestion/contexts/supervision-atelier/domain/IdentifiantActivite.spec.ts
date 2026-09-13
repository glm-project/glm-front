import { IdentifiantActivite } from './IdentifiantActivite';

describe('IdentifiantActivite', () => {
  it.each([
    ['act-1', true],
    ['act-2', false],
  ] as const)('should compare activity identity with %s by value', (other, expected) => {
    const identifiant = new IdentifiantActivite('act-1');

    expect(identifiant.equals(new IdentifiantActivite(other))).toBe(expected);
  });
});
