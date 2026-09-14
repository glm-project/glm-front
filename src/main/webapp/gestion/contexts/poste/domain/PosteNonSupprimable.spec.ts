import { PosteNonSupprimable } from './PosteNonSupprimable';
describe('PosteNonSupprimable', () => {
  it('should explain the workstation refusal to its caller', () => {
    const refus = new PosteNonSupprimable();
    expect(refus.code).toBe('poste-non-supprimable');
    expect(refus.message).toBe(
      'Ce poste ne peut pas être supprimé : des opérateurs y sont encore habilités ou des pointages y sont associés.',
    );
  });
});
