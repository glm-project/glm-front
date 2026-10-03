import { SaisieActe } from './SaisieActe';

const faitFixture = {
  type: 'FIN',
  intention: 'FIN',
  activiteVisee: 'travail-8',
  operateur: 'op-1',
  poste: '',
  instant: '2026-09-14T17:00:00.123456789+02:00',
} as const;

describe('Preparation of a resolution acte', () => {
  it('should leave the acte unchosen when a fact is edited before any explicit choice', () => {
    const saisie = SaisieActe.empty();

    const modifiee = saisie.afterChange({ fait: { operateur: 'op-1' } });

    expect(modifiee.command()).toBeUndefined();
    expect(modifiee.errors()).toEqual(['ACTE_REQUIS']);
  });
  it('should ignore fact fields when the manager has explicitly chosen cancellation', () => {
    const saisie = SaisieActe.cancel('fin-17').afterChange({ motif: 'Double appui' });

    const modifiee = saisie.afterChange({ fait: { activiteVisee: 'nc-12' } });

    expect(modifiee.command()).toEqual({ kind: 'ANNULATION', pointage: 'fin-17', motif: 'Double appui' });
  });
  it('should preserve the correction motif and original precision when editing only its target', () => {
    const saisie = SaisieActe.correct('fin-17', faitFixture).afterChange({ motif: 'Cible vérifiée' });

    const modifiee = saisie.afterChange({ fait: { activiteVisee: 'nc-12' } });

    expect(modifiee.command()).toEqual({
      kind: 'CORRECTION',
      pointage: 'fin-17',
      motif: 'Cible vérifiée',
      fait: { ...faitFixture, activiteVisee: 'nc-12' },
    });
    expect(saisie.command()).toEqual({ kind: 'CORRECTION', pointage: 'fin-17', motif: 'Cible vérifiée', fait: faitFixture });
  });
  it('should require the intention even after the pointage type has been chosen', () => {
    const saisie = SaisieActe.regularise();

    const modifiee = saisie.afterChange({ fait: { type: 'DEBUT' } });

    expect(modifiee.command()).toBeUndefined();
    expect(modifiee.errors()).toContain('INTENTION_REQUISE');
  });
  it('should accept a motif of exactly two hundred and fifty five characters', () => {
    const saisie = SaisieActe.cancel('fin-17').afterChange({ motif: 'x'.repeat(255) });

    const acte = saisie.command();

    expect(acte).toEqual({ kind: 'ANNULATION', pointage: 'fin-17', motif: 'x'.repeat(255) });
  });
  it('should start a regularisation without choosing its type or intention for the manager', () => {
    const saisie = SaisieActe.regularise();

    const acte = saisie.command();

    expect(acte).toBeUndefined();
    expect(saisie.errors()).toEqual(['TYPE_REQUIS', 'INTENTION_REQUISE', 'OPERATEUR_REQUIS', 'INSTANT_INVALIDE']);
  });
  it('should refuse a midnight represented as the twenty fourth hour instead of silently changing its day', () => {
    const saisie = SaisieActe.regularise({ ...faitFixture, instant: '2026-09-14T24:00:00+02:00' });

    const acte = saisie.command();

    expect(acte).toBeUndefined();
    expect(saisie.errors()).toContain('INSTANT_INVALIDE');
  });
  it('should require an explicit removal of the target when changing a transition into an opening', () => {
    const saisie = SaisieActe.correct('nc-12', { ...faitFixture, type: 'NON_CONFORMITE', intention: 'TRANSITION' });

    const ouverture = saisie.afterChange({ motif: 'Relance confirmée', fait: { intention: 'OUVERTURE' } });

    expect(ouverture.command()).toBeUndefined();
    expect(ouverture.errors()).toContain('CIBLE_INTERDITE');
  });
  it.each([
    [{ activiteVisee: '' }, 'CIBLE_REQUISE'],
    [{ operateur: '' }, 'OPERATEUR_REQUIS'],
    [{ instant: '2026-09-14T17:00' }, 'INSTANT_INVALIDE'],
    [{ instant: '2026-02-30T17:00:00Z' }, 'INSTANT_INVALIDE'],
    [{ type: 'DEBUT', intention: 'FIN' }, 'INTENTION_INCOMPATIBLE'],
  ] as const)('should refuse a malformed fact before previewing', (changement, erreur) => {
    const saisie = SaisieActe.regularise({ ...faitFixture, ...changement });

    const acte = saisie.command();

    expect(acte).toBeUndefined();
    expect(saisie.errors()).toContain(erreur);
  });
  it('should regularise a missing fact without adding a motif', () => {
    const saisie = SaisieActe.regularise(faitFixture).afterChange({ motif: 'Texte ignoré' });

    const acte = saisie.command();

    expect(acte).toEqual({ kind: 'REGULARISATION', fait: faitFixture });
  });
  it('should retain every fact including its original target and absolute instant when correcting', () => {
    const saisie = SaisieActe.correct('fin-17', faitFixture).afterChange({ motif: 'Cible vérifiée' });

    const acte = saisie.command();

    expect(acte).toEqual({ kind: 'CORRECTION', pointage: 'fin-17', motif: 'Cible vérifiée', fait: faitFixture });
  });
  it.each(['   ', 'x'.repeat(256)])('should reject an unusable cancellation motif', motif => {
    const saisie = SaisieActe.cancel('fin-17').afterChange({ motif });

    const acte = saisie.command();

    expect(acte).toBeUndefined();
    expect(saisie.errors()).toEqual(['MOTIF_INVALIDE']);
  });

  it('should require an explicit choice before producing an acte', () => {
    const saisie = SaisieActe.empty();

    const acte = saisie.command();

    expect(acte).toBeUndefined();
    expect(saisie.errors()).toEqual(['ACTE_REQUIS']);
  });

  it('should produce a cancellation for exactly the chosen pointage and motif', () => {
    const saisie = SaisieActe.cancel('fin-17').afterChange({ motif: 'Double appui' });

    const acte = saisie.command();

    expect(acte).toEqual({ kind: 'ANNULATION', pointage: 'fin-17', motif: 'Double appui' });
    expect(saisie.errors()).toEqual([]);
  });

  it('should require a motif when explicitly cancelling a pointage', () => {
    const saisie = SaisieActe.cancel('fin-17');

    const acte = saisie.command();

    expect(acte).toBeUndefined();
    expect(saisie.errors()).toEqual(['MOTIF_REQUIS']);
  });
});
