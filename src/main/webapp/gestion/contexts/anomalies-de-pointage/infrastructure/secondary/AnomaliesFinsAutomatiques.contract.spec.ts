import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { AnomaliesReadPort } from '../../domain/dossier/AnomaliesReadPort';
import { PointageAnomalieId } from '../../domain/dossier/PointageAnomalieId';
import { SuiviAnomalieId } from '../../domain/dossier/SuiviAnomalieId';
import { HttpAnomalies } from './HttpAnomalies';

const finAutomatiqueFixture: components['schemas']['RestFinAutomatiqueEnListe'] = {
  activite: 'travail-8',
  adresse: { suivi: 'suivi-camille', pointage: 'debut-8' },
  revision: 7,
  elementId: 'of-m24-0655',
  designation: 'OF M24-0655',
  operateurId: 'op-camille',
  operateur: { id: 'op-camille', nom: 'Martin', prenom: 'Camille' },
  posteId: 'poste-dmu',
  poste: { id: 'poste-dmu', libelle: 'DMU 50' },
  debut: '2026-09-14T08:00:00.123456789+02:00',
  echeance: '2026-09-14T21:00:00.123456789+02:00',
};

describe('Beyond the contract: HTTP automatic end reading', () => {
  let port: AnomaliesReadPort;
  let server: HttpTestingController;
  let errors: ErrorHandlerFixture;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ApiClient,
        { provide: ErrorHandlerPort, useClass: ErrorHandlerFixture },
        { provide: AnomaliesReadPort, useClass: HttpAnomalies },
      ],
    });
    port = TestBed.inject(AnomaliesReadPort);
    server = TestBed.inject(HttpTestingController);
    errors = TestBed.inject(ErrorHandlerPort) as ErrorHandlerFixture;
  });

  afterEach(() => {
    server.verify();
  });

  it('should request the automatic ends and keep the received instants and the opening address', async () => {
    const lecture = port.list({ operateur: 'Camille', element: 'OF', page: 2 });
    whenPageAnswers([finAutomatiqueFixture]);
    const page = await lecture;

    expect(page).toEqual({
      lignes: [
        {
          adresse: { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('debut-8') },
          designation: 'OF M24-0655',
          operateur: 'Camille Martin',
          poste: 'DMU 50',
          posteId: 'poste-dmu',
          debut: '2026-09-14T08:00:00.123456789+02:00',
          echeance: '2026-09-14T21:00:00.123456789+02:00',
        },
      ],
      total: 12,
    });
  });

  it('should keep only the workstation reference when the operator and the workstation cannot be resolved, and none for work without workstation', async () => {
    const sansFiches = { ...finAutomatiqueFixture };
    delete sansFiches.operateur;
    delete sansFiches.poste;
    const sansPoste = { ...sansFiches };
    delete sansPoste.posteId;

    const lecture = port.list({ operateur: 'Camille', element: 'OF', page: 2 });
    whenPageAnswers([sansFiches, sansPoste]);
    const page = await lecture;

    expect(page.lignes).toMatchObject([
      { operateur: '', poste: '', posteId: 'poste-dmu' },
      { operateur: '', poste: '' },
    ]);
    expect(page.lignes[1]).not.toHaveProperty('posteId');
    expect(page.lignes[0]).not.toHaveProperty('operateurId');
  });

  it('should report a failed read once and reject it', async () => {
    const lecture = port.list({ operateur: 'Camille', element: 'OF', page: 2 }).catch((failure: unknown) => failure);

    whenPageFails();
    const failure = await lecture;

    expect(errors.errors).toEqual([failure]);
  });

  const whenPageFails = (): void => {
    server
      .expectOne('/api/atelier/anomalies?operateur=Camille&element=OF&page=1&size=5')
      .flush({ type: 'urn:glm:erreur:inconnue' }, { status: 500, statusText: 'Server Error' });
  };

  const whenPageAnswers = (lignes: object[]): void => {
    server.expectOne('/api/atelier/anomalies?operateur=Camille&element=OF&page=1&size=5').flush({
      content: lignes,
      currentPage: 1,
      pageSize: 5,
      totalElementsCount: 12,
    });
  };
});
