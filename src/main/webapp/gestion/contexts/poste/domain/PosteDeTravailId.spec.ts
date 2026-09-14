import { PosteDeTravailId } from './PosteDeTravailId';
describe('PosteDeTravailId', () => {
  it('should retain the workstation identity supplied by the referential', () => {
    const id = new PosteDeTravailId('poste-tour-1');
    expect(id.value).toBe('poste-tour-1');
  });
});
