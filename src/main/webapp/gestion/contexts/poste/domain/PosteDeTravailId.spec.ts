import { PosteDeTravailId } from './PosteDeTravailId';

describe('PosteDeTravailId', () => {
  it('should retain the workstation identity supplied by the referential', () => {
    const id = new PosteDeTravailId('poste-tour-1');

    expect(id.value).toBe('poste-tour-1');
  });

  it('should be equal only to an identity carrying the same value', () => {
    const id = new PosteDeTravailId('tour-1');

    expect(id.equals(new PosteDeTravailId('tour-1'))).toBe(true);
    expect(id.equals(new PosteDeTravailId('tour-2'))).toBe(false);
    expect(id.equals(undefined)).toBe(false);
  });
});
