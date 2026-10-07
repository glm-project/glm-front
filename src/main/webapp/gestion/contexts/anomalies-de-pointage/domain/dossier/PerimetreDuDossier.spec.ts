import { ActiviteAnomalieId } from './ActiviteAnomalieId';
import { DiagnosticConflit, PointageAnomalie } from './DossierAnomalie';
import { OperateurAnomalieId } from './OperateurAnomalieId';
import { PerimetreDuDossier } from './PerimetreDuDossier';
import { PointageAnomalieId } from './PointageAnomalieId';

describe('Perimeter of a dossier', () => {
  it('should give the pointages of the perimeter in the order of the journal', () => {
    const perimetre = perimetreDe('fin', 'debut');
    const journal = [pointageFixture('debut'), pointageFixture('autre'), pointageFixture('fin')];

    expect(identifiants(perimetre.pointagesDe({ journal, diagnostics: [] }))).toEqual(['debut', 'fin']);
  });

  it('should ignore an identifier the journal does not hold', () => {
    const perimetre = perimetreDe('debut', 'inconnu');
    const journal = [pointageFixture('debut')];

    expect(identifiants(perimetre.pointagesDe({ journal, diagnostics: [] }))).toEqual(['debut']);
  });

  it('should give no pointage when the perimeter is empty and no diagnostic cites one', () => {
    const journal = [pointageFixture('debut')];

    expect(new PerimetreDuDossier([]).pointagesDe({ journal, diagnostics: [] })).toEqual([]);
  });

  it('should give no pointage beyond the perimeter when the dossier carries no diagnostics', () => {
    const journal = [pointageFixture('debut'), pointageFixture('autre')];

    expect(identifiants(perimetreDe('debut').pointagesDe({ journal }))).toEqual(['debut']);
  });

  it('should add the pointage a diagnostic is about', () => {
    const journal = [pointageFixture('debut'), pointageFixture('fin'), pointageFixture('autre')];

    const pointages = perimetreDe('debut').pointagesDe({ journal, diagnostics: [diagnosticFixture('fin')] });

    expect(identifiants(pointages)).toEqual(['debut', 'fin']);
  });

  it('should add the cancelled opening a diagnostic targets, in the order of the journal', () => {
    const journal = [pointageFixture('ouvrant-annule'), pointageFixture('fin'), pointageFixture('autre')];

    const pointages = perimetreDe('fin').pointagesDe({
      journal,
      diagnostics: [diagnosticFixture('fin', { ouvrant: 'ouvrant-annule' })],
    });

    expect(identifiants(pointages)).toEqual(['ouvrant-annule', 'fin']);
  });

  it('should add the pointage that ended the target of a diagnostic', () => {
    const journal = [pointageFixture('debut'), pointageFixture('premiere-fin'), pointageFixture('seconde-fin')];

    const pointages = perimetreDe('debut').pointagesDe({
      journal,
      diagnostics: [diagnosticFixture('seconde-fin', { termineePar: 'premiere-fin' })],
    });

    expect(identifiants(pointages)).toEqual(['debut', 'premiere-fin', 'seconde-fin']);
  });

  it('should keep both stops that target the same cancelled opening although the perimeter holds only the anchor', () => {
    const journal = [
      pointageFixture('ouvrant-annule'),
      pointageFixture('arret-un'),
      pointageFixture('arret-deux'),
      pointageFixture('autre'),
    ];

    const pointages = perimetreDe('arret-un').pointagesDe({
      journal,
      diagnostics: [
        diagnosticFixture('arret-un', { ouvrant: 'ouvrant-annule' }),
        diagnosticFixture('arret-deux', { ouvrant: 'ouvrant-annule' }),
      ],
    });

    expect(identifiants(pointages)).toEqual(['ouvrant-annule', 'arret-un', 'arret-deux']);
  });

  it('should give each pointage once when the perimeter and the diagnostics both name it', () => {
    const journal = [pointageFixture('debut'), pointageFixture('fin')];

    const pointages = perimetreDe('debut', 'fin').pointagesDe({
      journal,
      diagnostics: [diagnosticFixture('fin', { ouvrant: 'debut' })],
    });

    expect(identifiants(pointages)).toEqual(['debut', 'fin']);
  });

  describe('beyond the anomaly', () => {
    it('should give the pointages of the journal that the anomaly does not hold, in the order of the journal', () => {
      const journal = [pointageFixture('apres'), pointageFixture('debut'), pointageFixture('avant')];

      const horsDe = perimetreDe('debut').horsDe({ journal, diagnostics: [], operateur: CAMILLE });

      expect(identifiants(horsDe)).toEqual(['apres', 'avant']);
    });

    it('should leave out the pointages of another operator', () => {
      const journal = [
        pointageFixture('debut'),
        pointageFixture('de-camille', { operateur: 'camille' }),
        pointageFixture('d-alex', { operateur: 'alex' }),
      ];

      const horsDe = perimetreDe('debut').horsDe({ journal, diagnostics: [], operateur: CAMILLE });

      expect(identifiants(horsDe)).toEqual(['de-camille']);
    });

    it('should leave out the cancelled pointages', () => {
      const journal = [pointageFixture('debut'), pointageFixture('annule', { annule: true }), pointageFixture('actif')];

      const horsDe = perimetreDe('debut').horsDe({ journal, diagnostics: [], operateur: CAMILLE });

      expect(identifiants(horsDe)).toEqual(['actif']);
    });

    it('should leave out the pointages a diagnostic cites', () => {
      const journal = [pointageFixture('debut'), pointageFixture('cite'), pointageFixture('autre')];

      const horsDe = perimetreDe('debut').horsDe({ journal, diagnostics: [diagnosticFixture('cite')], operateur: CAMILLE });

      expect(identifiants(horsDe)).toEqual(['autre']);
    });

    it('should give no pointage when the anomaly holds the whole journal', () => {
      const journal = [pointageFixture('debut'), pointageFixture('fin')];

      expect(perimetreDe('debut', 'fin').horsDe({ journal, diagnostics: [], operateur: CAMILLE })).toEqual([]);
    });
  });
});

const CAMILLE = new OperateurAnomalieId('camille');

const perimetreDe = (...pointages: readonly string[]): PerimetreDuDossier =>
  new PerimetreDuDossier(pointages.map(pointage => new PointageAnomalieId(pointage)));

const identifiants = (pointages: readonly PointageAnomalie[]): readonly string[] => pointages.map(pointage => pointage.id.pointage);

const diagnosticFixture = (
  pointage: string,
  cible: { readonly ouvrant?: string; readonly termineePar?: string } = {},
): DiagnosticConflit => ({
  pointage: new PointageAnomalieId(pointage),
  raison: 'OUVRANT_ANNULE',
  cible: {
    activite: new ActiviteAnomalieId('travail'),
    ...(cible.ouvrant === undefined ? {} : { ouvrant: new PointageAnomalieId(cible.ouvrant) }),
    ...(cible.termineePar === undefined ? {} : { termineePar: new PointageAnomalieId(cible.termineePar) }),
  },
});

const pointageFixture = (id: string, options: { readonly operateur?: string; readonly annule?: true } = {}): PointageAnomalie => ({
  id: new PointageAnomalieId(id),
  fait: {
    type: 'DEBUT',
    intention: 'OUVERTURE',
    activiteVisee: 'travail',
    operateur: options.operateur ?? 'camille',
    poste: 'fraiseuse',
    instant: '2026-09-14T08:00:00Z',
  },
  operateurNom: 'Camille Martin',
  posteLibelle: 'Fraiseuse',
  auteur: 'Camille Martin',
  enregistre: '2026-09-15T10:00:00Z',
  regularisation: false,
  ...(options.annule === undefined ? {} : { annulation: { motif: 'Erreur', auteur: 'camille', instant: '2026-09-15T11:00:00Z' } }),
});
