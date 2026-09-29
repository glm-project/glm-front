import { ElementReleveId } from './ElementReleveId';

describe('ElementReleveId', () => {
  it('should be the same as an identifier of the same value', () => {
    expect(new ElementReleveId('carter').estLeMeme(new ElementReleveId('carter'))).toBe(true);
  });

  it('should not be the same as an identifier of another value', () => {
    expect(new ElementReleveId('carter').estLeMeme(new ElementReleveId('bride'))).toBe(false);
  });
});
