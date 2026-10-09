import { adresseDeLaDestination, dansLaPage, pageAvant } from './AnomalieSuivante';
import { AdresseDossier, FiltreAnomalies, LigneFinAutomatique, PageAnomalies } from './DossierAnomalie';
import { ElementAnomalieId } from './ElementAnomalieId';
import { PointageAnomalieId } from './PointageAnomalieId';
import { SuiviAnomalieId } from './SuiviAnomalieId';

describe('Next anomaly', () => {
  describe('in a page of the list', () => {
    it('should lead to the first row of the page', () => {
      const page = unePage([uneLigne('suivi-2', 'debut-2'), uneLigne('suivi-3', 'debut-3')]);

      expect(dansLaPage(page, uneAdresse('suivi-1', 'debut-1'))).toEqual({
        kind: 'AUTRE_LIGNE',
        adresse: uneAdresse('suivi-2', 'debut-2'),
      });
    });

    it('should skip the address the manager comes from, which may remain in the list', () => {
      const page = unePage([uneLigne('suivi-1', 'debut-1'), uneLigne('suivi-3', 'debut-3')]);

      expect(dansLaPage(page, uneAdresse('suivi-1', 'debut-1'))).toEqual({
        kind: 'AUTRE_LIGNE',
        adresse: uneAdresse('suivi-3', 'debut-3'),
      });
    });

    it('should keep a row of the same pointage in another follow-up', () => {
      const page = unePage([uneLigne('suivi-2', 'debut-1')]);

      expect(dansLaPage(page, uneAdresse('suivi-1', 'debut-1'))).toEqual({
        kind: 'AUTRE_LIGNE',
        adresse: uneAdresse('suivi-2', 'debut-1'),
      });
    });

    it.each([
      { cas: 'an empty page', lignes: [] },
      { cas: 'a page holding only the address the manager comes from', lignes: [uneLigne('suivi-1', 'debut-1')] },
    ])('should lead nowhere on $cas', ({ lignes }) => {
      expect(dansLaPage(unePage(lignes), uneAdresse('suivi-1', 'debut-1'))).toBeUndefined();
    });
  });

  describe('page before', () => {
    it('should step back one page and keep the other filters', () => {
      const filtre: FiltreAnomalies = { operateur: 'op-1', element: 'el-1', page: 3 };

      expect(pageAvant(filtre)).toEqual({ operateur: 'op-1', element: 'el-1', page: 2 });
    });

    it('should not step back before the first page', () => {
      expect(pageAvant({ operateur: '', element: '', page: 1 })).toBeUndefined();
    });
  });

  describe('address of a destination', () => {
    it('should be the address of a dossier to open', () => {
      expect(adresseDeLaDestination({ kind: 'AUTRE_LIGNE', adresse: uneAdresse('suivi-2', 'debut-2') })).toEqual(
        uneAdresse('suivi-2', 'debut-2'),
      );
    });

    it.each(['PLUS_AUCUNE_ANOMALIE', 'LISTE'] as const)('should be none when the destination is %s', kind => {
      expect(adresseDeLaDestination({ kind })).toBeUndefined();
    });
  });

  const uneAdresse = (suivi: string, pointage: string): AdresseDossier => ({
    suivi: new SuiviAnomalieId(suivi),
    pointage: new PointageAnomalieId(pointage),
  });

  const uneLigne = (suivi: string, pointage: string): LigneFinAutomatique => ({
    adresse: uneAdresse(suivi, pointage),
    element: new ElementAnomalieId('element-1'),
    designation: 'Pièce',
    operateur: 'Luc',
    poste: 'Scie',
    debut: '2026-09-14T08:00:00Z',
    echeance: '2026-09-14T21:00:00Z',
  });

  const unePage = (lignes: readonly LigneFinAutomatique[]): PageAnomalies => ({
    lignes,
    total: lignes.length,
  });
});
