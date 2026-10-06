import { ActiviteAnomalieId } from '../dossier/ActiviteAnomalieId';
import { ActiviteAnomalie } from '../dossier/DossierAnomalie';
import { PointageAnomalieId } from '../dossier/PointageAnomalieId';
import { CadreDuFait } from './CadreDuFait';
import { SaisieActe } from './SaisieActe';

const faitFixture = {
  type: 'FIN',
  intention: 'FIN',
  activiteVisee: 'travail-8',
  operateur: 'op-1',
  poste: '',
  instant: '2026-09-14T17:00:00.123456789+02:00',
} as const;

const cadreOuvert = CadreDuFait.depuis([], '2026-09-15T00:00:00Z');

describe('Preparation of a resolution acte', () => {
  it('should leave the acte unchosen when a fact is edited before any explicit choice', () => {
    const saisie = SaisieActe.empty();

    const modifiee = saisie.afterChange({ fait: { operateur: 'op-1' } });

    expect(modifiee.command(cadreOuvert)).toBeUndefined();
    expect(modifiee.errors(cadreOuvert)).toEqual(['ACTE_REQUIS']);
  });
  it('should ignore fact fields when the manager has explicitly chosen cancellation', () => {
    const saisie = SaisieActe.cancel('fin-17').afterChange({ motif: 'Double appui' });

    const modifiee = saisie.afterChange({ fait: { activiteVisee: 'nc-12' } });

    expect(modifiee.command(cadreOuvert)).toEqual({ kind: 'ANNULATION', pointage: 'fin-17', motif: 'Double appui' });
  });
  it('should preserve the correction motif and original precision when editing only its target', () => {
    const saisie = SaisieActe.correct('fin-17', faitFixture).afterChange({ motif: 'Cible vérifiée' });

    const modifiee = saisie.afterChange({ fait: { activiteVisee: 'nc-12' } });

    expect(modifiee.command(cadreOuvert)).toEqual({
      kind: 'CORRECTION',
      pointage: 'fin-17',
      motif: 'Cible vérifiée',
      fait: { ...faitFixture, activiteVisee: 'nc-12' },
    });
    expect(saisie.command(cadreOuvert)).toEqual({ kind: 'CORRECTION', pointage: 'fin-17', motif: 'Cible vérifiée', fait: faitFixture });
  });
  it('should require the intention even after the pointage type has been chosen', () => {
    const saisie = SaisieActe.regularise();

    const modifiee = saisie.afterChange({ fait: { type: 'DEBUT' } });

    expect(modifiee.command(cadreOuvert)).toBeUndefined();
    expect(modifiee.errors(cadreOuvert)).toContain('INTENTION_REQUISE');
  });
  it('should accept a motif of exactly two hundred and fifty five characters', () => {
    const saisie = SaisieActe.cancel('fin-17').afterChange({ motif: 'x'.repeat(255) });

    const acte = saisie.command(cadreOuvert);

    expect(acte).toEqual({ kind: 'ANNULATION', pointage: 'fin-17', motif: 'x'.repeat(255) });
  });
  it('should leave all facts unchosen when starting a missing-fact regularisation', () => {
    const saisie = SaisieActe.regularise();

    const acte = saisie.command(cadreOuvert);

    expect(acte).toBeUndefined();
    expect(saisie.errors(cadreOuvert)).toEqual(['TYPE_REQUIS', 'INTENTION_REQUISE', 'OPERATEUR_REQUIS', 'INSTANT_INVALIDE']);
    expect(saisie.proposition).toEqual({
      kind: 'REGULARISATION',
      fait: { type: '', intention: '', activiteVisee: '', operateur: '', poste: '', instant: '' },
    });
  });
  it('should wait for the manager to date a prefilled end regularisation instead of proposing a time', () => {
    const saisie = SaisieActe.regularise({ ...faitFixture, poste: 'poste-3', instant: '' });

    const acte = saisie.command(cadreOuvert);

    expect(acte).toBeUndefined();
    expect(saisie.errors(cadreOuvert)).toEqual(['INSTANT_INVALIDE']);
  });
  it('should regularise the end at the instant entered by the manager while keeping the prefilled fact', () => {
    const saisie = SaisieActe.regularise({ ...faitFixture, poste: 'poste-3', instant: '' }).afterChange({
      fait: { instant: '2026-09-14T17:00:00.123456789+02:00' },
    });

    const acte = saisie.command(cadreOuvert);

    expect(acte).toEqual({ kind: 'REGULARISATION', fait: { ...faitFixture, poste: 'poste-3' } });
  });
  it('should refuse a midnight represented as the twenty fourth hour instead of silently changing its day', () => {
    const saisie = SaisieActe.regularise({ ...faitFixture, instant: '2026-09-14T24:00:00+02:00' });

    const acte = saisie.command(cadreOuvert);

    expect(acte).toBeUndefined();
    expect(saisie.errors(cadreOuvert)).toContain('INSTANT_INVALIDE');
  });
  it('should require an explicit removal of the target when changing a transition into an opening', () => {
    const saisie = SaisieActe.correct('nc-12', { ...faitFixture, type: 'NON_CONFORMITE', intention: 'TRANSITION' });

    const ouverture = saisie.afterChange({ motif: 'Relance confirmée', fait: { intention: 'OUVERTURE' } });

    expect(ouverture.command(cadreOuvert)).toBeUndefined();
    expect(ouverture.errors(cadreOuvert)).toContain('CIBLE_INTERDITE');
  });
  it('should require an empty target even when an opening target contains only spaces', () => {
    const saisie = SaisieActe.regularise({ ...faitFixture, type: 'DEBUT', intention: 'OUVERTURE', activiteVisee: '   ' });

    const acte = saisie.command(cadreOuvert);

    expect(acte).toBeUndefined();
    expect(saisie.errors(cadreOuvert)).toContain('CIBLE_INTERDITE');
  });
  it.each([
    [{ activiteVisee: '' }, 'CIBLE_REQUISE'],
    [{ activiteVisee: '   ' }, 'CIBLE_REQUISE'],
    [{ type: 'NON_CONFORMITE', intention: 'TRANSITION', activiteVisee: '' }, 'CIBLE_REQUISE'],
    [{ operateur: '' }, 'OPERATEUR_REQUIS'],
    [{ operateur: '   ' }, 'OPERATEUR_REQUIS'],
    [{ instant: '2026-09-14T17:00' }, 'INSTANT_INVALIDE'],
    [{ instant: '2026-02-30T17:00:00Z' }, 'INSTANT_INVALIDE'],
    [{ type: 'DEBUT', intention: 'FIN' }, 'INTENTION_INCOMPATIBLE'],
  ] as const)('should refuse a malformed fact before previewing', (changement, erreur) => {
    const saisie = SaisieActe.regularise({ ...faitFixture, ...changement });

    const acte = saisie.command(cadreOuvert);

    expect(acte).toBeUndefined();
    expect(saisie.errors(cadreOuvert)).toContain(erreur);
  });
  it('should regularise a missing fact without adding a motif', () => {
    const saisie = SaisieActe.regularise(faitFixture).afterChange({ motif: 'Texte ignoré' });

    const acte = saisie.command(cadreOuvert);

    expect(acte).toEqual({ kind: 'REGULARISATION', fait: faitFixture });
  });
  it('should retain every fact including its original target and absolute instant when correcting', () => {
    const saisie = SaisieActe.correct('fin-17', faitFixture).afterChange({ motif: 'Cible vérifiée' });

    const acte = saisie.command(cadreOuvert);

    expect(acte).toEqual({ kind: 'CORRECTION', pointage: 'fin-17', motif: 'Cible vérifiée', fait: faitFixture });
  });
  it('should require the manager to provide a motif before correcting the selected pointage', () => {
    const saisie = SaisieActe.correct('fin-17', faitFixture);

    const acte = saisie.command(cadreOuvert);

    expect(acte).toBeUndefined();
    expect(saisie.errors(cadreOuvert)).toEqual(['MOTIF_REQUIS']);
  });
  it.each(['   ', 'x'.repeat(256)])('should reject an unusable cancellation motif', motif => {
    const saisie = SaisieActe.cancel('fin-17').afterChange({ motif });

    const acte = saisie.command(cadreOuvert);

    expect(acte).toBeUndefined();
    expect(saisie.errors(cadreOuvert)).toEqual(['MOTIF_INVALIDE']);
  });

  it('should require an explicit choice before producing an acte', () => {
    const saisie = SaisieActe.empty();

    const acte = saisie.command(cadreOuvert);

    expect(acte).toBeUndefined();
    expect(saisie.errors(cadreOuvert)).toEqual(['ACTE_REQUIS']);
  });

  it('should produce a cancellation for exactly the chosen pointage and motif', () => {
    const saisie = SaisieActe.cancel('fin-17').afterChange({ motif: 'Double appui' });

    const acte = saisie.command(cadreOuvert);

    expect(acte).toEqual({ kind: 'ANNULATION', pointage: 'fin-17', motif: 'Double appui' });
    expect(saisie.errors(cadreOuvert)).toEqual([]);
  });

  it('should require a motif when explicitly cancelling a pointage', () => {
    const saisie = SaisieActe.cancel('fin-17');

    const acte = saisie.command(cadreOuvert);

    expect(acte).toBeUndefined();
    expect(saisie.errors(cadreOuvert)).toEqual(['MOTIF_REQUIS']);
  });
  it('should await the dating of a regularisation but not of a correction or a cancellation', () => {
    expect(SaisieActe.regularise().awaitsDating()).toBe(true);
    expect(SaisieActe.correct('fin-18', faitFixture).awaitsDating()).toBe(false);
    expect(SaisieActe.cancel('fin-18').awaitsDating()).toBe(false);
    expect(SaisieActe.empty().awaitsDating()).toBe(false);
  });
  it('should keep the guided choice when the manager only dates a regularisation', () => {
    const saisie = SaisieActe.regularise({ ...faitFixture, instant: '' });

    expect(saisie.changesGuidedFact({ fait: { instant: '2026-09-14T17:00:00+02:00' } })).toBe(false);
  });
  it.each([{ fait: { operateur: 'op-2' } }, { fait: { instant: '2026-09-14T17:00:00+02:00', poste: 'poste-3' } }, { fait: {} }])(
    'should drop the guided choice when a regularisation changes more than its date: %j',
    changement => {
      const saisie = SaisieActe.regularise({ ...faitFixture, instant: '' });

      expect(saisie.changesGuidedFact(changement)).toBe(true);
    },
  );
  it('should drop the guided choice when a correction changes only its time', () => {
    const saisie = SaisieActe.correct('fin-18', faitFixture);

    expect(saisie.changesGuidedFact({ fait: { instant: '2026-09-14T18:00:00+02:00' } })).toBe(true);
  });
  it('should keep the guided choice when only the motif changes', () => {
    const saisie = SaisieActe.correct('fin-18', faitFixture);

    expect(saisie.changesGuidedFact({ motif: 'Fin confirmée' })).toBe(false);
  });
});

const DEBUT_DU_TRAVAIL = '2026-09-14T08:00:00-03:00';
const MAINTENANT = '2026-09-14T15:00:00-03:00';
const travail: ActiviteAnomalie = {
  id: new ActiviteAnomalieId('travail-8'),
  libelle: 'Travail',
  etat: 'TERMINEE',
  temps: 'PT1H',
  ouvrant: new PointageAnomalieId('debut-8'),
  periode: { categorie: 'TRAVAIL', debut: DEBUT_DU_TRAVAIL },
};
const cadreFixture = CadreDuFait.depuis([travail], MAINTENANT);

describe('Bounds of the instant of a fact', () => {
  it('should refuse a fact that precedes the start of the activity it ends', () => {
    const saisie = SaisieActe.regularise({ ...faitFixture, instant: '2026-09-14T07:59:59-03:00' });

    expect(saisie.errors(cadreFixture)).toEqual(['INSTANT_AVANT_CIBLE']);
    expect(saisie.command(cadreFixture)).toBeUndefined();
  });

  it('should accept a fact that starts exactly when the activity it ends started', () => {
    const saisie = SaisieActe.regularise({ ...faitFixture, instant: DEBUT_DU_TRAVAIL });

    expect(saisie.errors(cadreFixture)).toEqual([]);
  });

  it('should refuse a fact one second in the future', () => {
    const saisie = SaisieActe.regularise({ ...faitFixture, instant: '2026-09-14T15:00:01-03:00' });

    expect(saisie.errors(cadreFixture)).toEqual(['INSTANT_FUTUR']);
    expect(saisie.command(cadreFixture)).toBeUndefined();
  });

  it('should accept a fact at exactly the current time', () => {
    const saisie = SaisieActe.regularise({ ...faitFixture, instant: MAINTENANT });

    expect(saisie.errors(cadreFixture)).toEqual([]);
  });

  it.each([
    { cas: 'before the start by a fraction of a second', instant: '2026-09-14T07:59:59.999999999-03:00', erreurs: ['INSTANT_AVANT_CIBLE'] },
    { cas: 'at the start with the same nanoseconds', instant: '2026-09-14T08:00:00.000000000-03:00', erreurs: [] },
    { cas: 'after the current time by a nanosecond', instant: '2026-09-14T15:00:00.000000001-03:00', erreurs: ['INSTANT_FUTUR'] },
    { cas: 'before the start in another time zone', instant: '2026-09-14T10:59:59Z', erreurs: ['INSTANT_AVANT_CIBLE'] },
    { cas: 'at the start in another time zone', instant: '2026-09-14T11:00:00Z', erreurs: [] },
    { cas: 'at the current time in another time zone', instant: '2026-09-14T18:00:00Z', erreurs: [] },
    { cas: 'after the current time in another time zone', instant: '2026-09-14T20:00:01+02:00', erreurs: ['INSTANT_FUTUR'] },
  ])('should compare instants equivalent whatever their offset or precision: $cas', ({ instant, erreurs }) => {
    const saisie = SaisieActe.regularise({ ...faitFixture, instant });

    expect(saisie.errors(cadreFixture)).toEqual(erreurs);
  });

  it('should bound the fact by the activity the manager aims at now', () => {
    const nonConformite: ActiviteAnomalie = {
      ...travail,
      id: new ActiviteAnomalieId('nc-12'),
      periode: { categorie: 'NON_CONFORMITE', debut: '2026-09-14T10:00:00-03:00' },
    };
    const cadre = CadreDuFait.depuis([travail, nonConformite], MAINTENANT);
    const saisie = SaisieActe.regularise({ ...faitFixture, instant: '2026-09-14T09:00:00-03:00' });

    const visantLaNonConformite = saisie.afterChange({ fait: { activiteVisee: 'nc-12' } });

    expect(saisie.errors(cadre)).toEqual([]);
    expect(visantLaNonConformite.errors(cadre)).toEqual(['INSTANT_AVANT_CIBLE']);
  });

  it('should apply no lower bound to an opening, which aims at no activity', () => {
    const ouverture = { ...faitFixture, type: 'DEBUT', intention: 'OUVERTURE', activiteVisee: '' } as const;

    expect(SaisieActe.regularise({ ...ouverture, instant: '2026-09-14T07:00:00-03:00' }).errors(cadreFixture)).toEqual([]);
    expect(SaisieActe.regularise({ ...ouverture, instant: '2026-09-14T16:00:00-03:00' }).errors(cadreFixture)).toEqual(['INSTANT_FUTUR']);
  });

  it('should apply no lower bound when the aimed activity is not in the dossier', () => {
    const saisie = SaisieActe.regularise({ ...faitFixture, activiteVisee: 'inconnue-1', instant: '2026-09-14T07:00:00-03:00' });

    expect(saisie.errors(cadreFixture)).toEqual([]);
  });

  it('should bound a correction like a regularisation, besides its missing motif', () => {
    const saisie = SaisieActe.correct('fin-17', { ...faitFixture, instant: '2026-09-14T16:00:00-03:00' });

    expect(saisie.errors(cadreFixture)).toEqual(['INSTANT_FUTUR', 'MOTIF_REQUIS']);
  });

  it('should leave an unreadable instant alone, without bounds', () => {
    const saisie = SaisieActe.regularise({ ...faitFixture, instant: '' });

    expect(saisie.errors(cadreFixture)).toEqual(['INSTANT_INVALIDE']);
  });

  it('should not bound a cancellation, which proposes no fact', () => {
    const saisie = SaisieActe.cancel('fin-17').afterChange({ motif: 'Double appui' });

    expect(saisie.errors(cadreFixture)).toEqual([]);
    expect(saisie.command(cadreFixture)).toEqual({ kind: 'ANNULATION', pointage: 'fin-17', motif: 'Double appui' });
  });

  it('should match the preview of a fact beyond the clock, since matching ignores the bounds of the fact', () => {
    const saisie = SaisieActe.regularise({ ...faitFixture, instant: '2099-01-01T00:00:00-03:00' });

    expect(saisie.matches({ kind: 'REGULARISATION', fait: { ...faitFixture, instant: '2099-01-01T00:00:00-03:00' } })).toBe(true);
  });
});
