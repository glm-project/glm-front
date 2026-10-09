import { components } from '@/app/generated/schema';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { anomaliesDePointageProvider } from '@/gestion/anomalies-de-pointage.provider';
import { AnomaliesReadPort } from '@/gestion/contexts/anomalies-de-pointage/domain/dossier/AnomaliesReadPort';
import { PageAnomalies } from '@/gestion/contexts/anomalies-de-pointage/domain/dossier/DossierAnomalie';
import { ElementAnomalie } from '@/gestion/contexts/anomalies-de-pointage/domain/dossier/ElementAnomalie';
import { ElementAnomalieId } from '@/gestion/contexts/anomalies-de-pointage/domain/dossier/ElementAnomalieId';
import { OperateurAnomalie } from '@/gestion/contexts/anomalies-de-pointage/domain/dossier/OperateurAnomalie';
import { OperateurAnomalieId } from '@/gestion/contexts/anomalies-de-pointage/domain/dossier/OperateurAnomalieId';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';

describe('Real anomaly reading composition', () => {
  let server: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ...anomaliesDePointageProvider,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ErrorHandlerPort, useValue: new ErrorHandlerFixture() },
      ],
    });
    server = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    server.verify();
  });

  it('should list the automatic ends through the public read port on the same-origin API', async () => {
    const lecture = whenListingTheAutomaticEnds();
    whenTheAutomaticEndsAnswer();

    expect(await lecture).toEqual({ lignes: [], total: 0 });
  });

  const whenListingTheAutomaticEnds = (): Promise<PageAnomalies> =>
    TestBed.inject(AnomaliesReadPort).list({ operateur: '', element: '', page: 1 });

  const whenTheAutomaticEndsAnswer = (): void => {
    server.expectOne('/api/atelier/anomalies?operateur=&element=&page=0&size=5').flush({
      content: [],
      currentPage: 0,
      pageSize: 5,
      totalElementsCount: 0,
    } satisfies components['schemas']['PageRestFinAutomatiqueEnListe']);
  };

  it('should read the operators through the public read port on the same-origin API', async () => {
    const lecture = whenReadingTheOperators();
    whenTheOperatorsAnswer();

    const operateurs = await lecture;

    expect(operateurs).toEqual([
      {
        id: new OperateurAnomalieId('op-camille'),
        nom: 'Camille Martin',
        code: '007',
      },
    ]);
  });

  const whenReadingTheOperators = (): Promise<readonly OperateurAnomalie[]> => TestBed.inject(AnomaliesReadPort).operateurs();

  const whenTheOperatorsAnswer = (): void => {
    server.expectOne('/api/operateurs?page=0&size=100').flush({
      content: [
        {
          id: 'op-camille',
          identifiant: '007',
          prenom: 'Camille',
          nom: 'Martin',
          natures: ['tournage'],
          postes: [{ id: 'poste-tour', libelle: 'Tour 1', nature: 'tournage' }],
        },
      ],
      currentPage: 0,
      pageSize: 100,
      totalElementsCount: 1,
    } satisfies components['schemas']['PageRestOperateur']);
  };

  it('should read the element referential through the public read port on the same-origin API', async () => {
    const lecture = whenReadingTheElements();
    whenTheElementsAnswer();

    const elements = await lecture;

    expect(elements).toEqual([{ id: new ElementAnomalieId('element-bielle'), nom: 'Bielle', reference: 'OF M24-0655' }]);
  });

  const whenReadingTheElements = (): Promise<readonly ElementAnomalie[]> => TestBed.inject(AnomaliesReadPort).elements();

  const whenTheElementsAnswer = (): void => {
    server
      .expectOne(request => request.url === '/api/elements-de-fabrication' && request.params.get('page') === '0')
      .flush({
        content: [{ id: 'element-bielle', nom: 'Bielle', reference: 'OF M24-0655', categorie: 'MOULE' }],
        currentPage: 0,
        pageSize: 100,
        totalElementsCount: 1,
      } satisfies components['schemas']['PageRestElementDeFabrication']);
  };
});
