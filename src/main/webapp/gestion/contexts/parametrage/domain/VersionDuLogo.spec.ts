import { VersionDuLogo } from './VersionDuLogo';

describe('VersionDuLogo', () => {
  it('should retain the fingerprint the server gave', () => {
    const version = new VersionDuLogo('0123456789abcdef');

    expect(version.value).toBe('0123456789abcdef');
  });

  it.each(['', '0123456789ABCDEF', '0123', '../logo/0123456'])('should refuse %p', valeur => {
    expect(() => new VersionDuLogo(valeur)).toThrow(`Version de logo invalide : ${valeur}`);
  });
});
