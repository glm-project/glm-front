import { suiteDuLogo } from './LogoDuPupitre';

const GARDE = { version: '0123456789abcdef', image: 'data:image/png;base64,iVBORw0K' };

describe('Logo of the pupitre', () => {
  it('should keep no logo when the company has none', () => {
    expect(suiteDuLogo(undefined, GARDE)).toEqual({ kind: 'GARDER' });
  });

  it('should keep the stored image while its version is unchanged', () => {
    expect(suiteDuLogo({ version: GARDE.version }, GARDE)).toEqual({ kind: 'GARDER', logo: GARDE });
  });

  it('should download the image of another version', () => {
    expect(suiteDuLogo({ version: 'fedcba9876543210' }, GARDE)).toEqual({ kind: 'TELECHARGER', version: 'fedcba9876543210' });
  });

  it('should download the image of a first logo', () => {
    expect(suiteDuLogo({ version: GARDE.version }, undefined)).toEqual({ kind: 'TELECHARGER', version: GARDE.version });
  });
});
