import { conflitAExpliquer } from './ConflitAExpliquer';

describe('Conflict to explain on a dossier', () => {
  it.each([
    { enConflit: true, finAutomatique: false },
    { enConflit: true, finAutomatique: true },
  ])('should explain the conflict the perimeter still carries when the automatic end is $finAutomatique', dossier => {
    expect(conflitAExpliquer(dossier)).toBe(true);
  });

  it.each([
    { enConflit: false, finAutomatique: false },
    { enConflit: false, finAutomatique: true },
  ])('should explain nothing when the perimeter carries no conflict and the automatic end is $finAutomatique', dossier => {
    expect(conflitAExpliquer(dossier)).toBe(false);
  });
});
