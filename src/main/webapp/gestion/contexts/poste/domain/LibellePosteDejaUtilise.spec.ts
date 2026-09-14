import { LibellePosteDejaUtilise } from './LibellePosteDejaUtilise';
describe('LibellePosteDejaUtilise', () => {
  it('should explain the workstation refusal to its caller', () => {
    const refus = new LibellePosteDejaUtilise();
    expect(refus.code).toBe('libelle-deja-utilise');
    expect(refus.message).toBe('Un autre poste porte déjà ce libellé.');
  });
});
