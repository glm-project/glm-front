import { TestBed } from '@angular/core/testing';
import { AnomaliesReadPort } from '../domain/dossier/AnomaliesReadPort';
import { DestinationSuivante } from '../domain/dossier/AnomalieSuivante';
import { AdresseDossier, FiltreAnomalies, LigneFinAutomatique, PageAnomalies } from '../domain/dossier/DossierAnomalie';
import { ElementAnomalieId } from '../domain/dossier/ElementAnomalieId';
import { PointageAnomalieId } from '../domain/dossier/PointageAnomalieId';
import { SuiviAnomalieId } from '../domain/dossier/SuiviAnomalieId';
import { RechercheDeLAnomalieSuivante } from './RechercheDeLAnomalieSuivante';

describe('Search of the next anomaly', () => {
  it('should lead to the automatic end remaining on the dossier without reading the list', async () => {
    const lecture = uneListe({});

    const destination = await whenSearching(lecture, { finsAutomatiquesRestantes: [uneAdresse('suivi-1', 'debut-8')] });

    expect(destination).toEqual({ kind: 'FIN_AUTOMATIQUE_RESTANTE', adresse: uneAdresse('suivi-1', 'debut-8') });
    expect(lecture.lues).toEqual([]);
  });

  it('should lead to another row of the page of the filter, read once', async () => {
    const lecture = uneListe({ 2: [uneLigne('suivi-1', 'debut-1'), uneLigne('suivi-2', 'debut-2')] });

    const destination = await whenSearching(lecture, sansFinRestante, { ...filtre, page: 2 });

    expect(destination).toEqual({ kind: 'AUTRE_LIGNE', adresse: uneAdresse('suivi-2', 'debut-2') });
    expect(lecture.lues).toEqual([{ ...filtre, page: 2 }]);
  });

  it('should step back to the previous page, once, when the page holds no other row', async () => {
    const lecture = uneListe({ 2: [], 1: [uneLigne('suivi-3', 'debut-3')] });

    const destination = await whenSearching(lecture, sansFinRestante, { ...filtre, page: 2 });

    expect(destination).toEqual({ kind: 'AUTRE_LIGNE', adresse: uneAdresse('suivi-3', 'debut-3') });
    expect(lecture.lues.map(lue => lue.page)).toEqual([2, 1]);
  });

  it('should not step back further than the previous page', async () => {
    const lecture = uneListe({ 3: [], 2: [], 1: [uneLigne('suivi-3', 'debut-3')] });

    const destination = await whenSearching(lecture, sansFinRestante, { ...filtre, page: 3 });

    expect(destination).toEqual({ kind: 'PLUS_AUCUNE_ANOMALIE' });
    expect(lecture.lues.map(lue => lue.page)).toEqual([3, 2]);
  });

  it('should say no anomaly is left, without stepping back, when the first page holds no other row', async () => {
    const lecture = uneListe({ 1: [uneLigne('suivi-1', 'debut-1')] });

    const destination = await whenSearching(lecture, sansFinRestante, { ...filtre, page: 1 });

    expect(destination).toEqual({ kind: 'PLUS_AUCUNE_ANOMALIE' });
    expect(lecture.lues).toHaveLength(1);
  });

  it.each([
    { cas: 'the page of the filter', echecs: [2] },
    { cas: 'the previous page', echecs: [1] },
  ])('should lead back to the list when the read of $cas fails', async ({ echecs }) => {
    const lecture = uneListe({ 2: [], 1: [] }, echecs);

    const destination = await whenSearching(lecture, sansFinRestante, { ...filtre, page: 2 });

    expect(destination).toEqual({ kind: 'LISTE' });
  });

  const filtre: FiltreAnomalies = { nature: 'FIN_AUTOMATIQUE', operateur: 'op-1', element: '', page: 1 };
  const sansFinRestante = { finsAutomatiquesRestantes: [] };

  const whenSearching = (
    lecture: ListeDouble,
    issue: { readonly finsAutomatiquesRestantes: readonly AdresseDossier[] },
    filtreDemande: FiltreAnomalies = filtre,
  ): Promise<DestinationSuivante> => {
    TestBed.configureTestingModule({ providers: [RechercheDeLAnomalieSuivante, { provide: AnomaliesReadPort, useValue: lecture }] });
    return TestBed.inject(RechercheDeLAnomalieSuivante).destination(issue, uneAdresse('suivi-1', 'debut-1'), filtreDemande);
  };

  interface ListeDouble {
    readonly lues: FiltreAnomalies[];
    list(filtre: FiltreAnomalies): Promise<PageAnomalies>;
  }

  const uneListe = (pages: Record<number, readonly LigneFinAutomatique[]>, echecs: readonly number[] = []): ListeDouble => {
    const lues: FiltreAnomalies[] = [];
    return {
      lues,
      list: (demande: FiltreAnomalies) => {
        lues.push(demande);
        if (echecs.includes(demande.page)) return Promise.reject(new Error('lecture impossible'));
        const lignes = pages[demande.page] ?? [];
        return Promise.resolve({ nature: 'FIN_AUTOMATIQUE', lignes, total: lignes.length, complete: true });
      },
    };
  };

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
});
