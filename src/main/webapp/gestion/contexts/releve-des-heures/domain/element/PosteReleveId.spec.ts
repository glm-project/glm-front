import { PosteReleveId } from './PosteReleveId';

describe('PosteReleveId', () => {
  it('should be the same as an identifier of the same value', () => {
    expect(new PosteReleveId('dmu').estLeMeme(new PosteReleveId('dmu'))).toBe(true);
  });

  it('should not be the same as an identifier of another value', () => {
    expect(new PosteReleveId('dmu').estLeMeme(new PosteReleveId('mazak'))).toBe(false);
  });
});
