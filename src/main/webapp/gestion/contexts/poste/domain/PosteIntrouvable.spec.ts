import { PosteIntrouvable } from './PosteIntrouvable';
describe('PosteIntrouvable', () => {
  it('should explain the workstation refusal to its caller', () => {
    const refus = new PosteIntrouvable();
    expect(refus.code).toBe('poste-introuvable');
    expect(refus.message).toBe('Ce poste n’existe plus. Actualisez la liste des postes.');
  });
});
