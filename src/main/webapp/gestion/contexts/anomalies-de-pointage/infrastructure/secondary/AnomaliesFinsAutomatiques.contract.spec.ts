import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { AnomaliesReadPort } from '../../domain/dossier/AnomaliesReadPort';
import { NatureAnomalie } from '../../domain/dossier/DossierAnomalie';
import { ElementAnomalieId } from '../../domain/dossier/ElementAnomalieId';
import { PointageAnomalieId } from '../../domain/dossier/PointageAnomalieId';
import { SuiviAnomalieId } from '../../domain/dossier/SuiviAnomalieId';
import { HttpAnomalies } from './HttpAnomalies';

const finAutomatiqueFixture: components['schemas']['RestFinAutomatiqueEnListe'] = {
  nature: 'FIN_AUTOMATIQUE',
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

const conflitFixture: components['schemas']['RestConflitEnListe'] = {
  nature: 'CONFLIT',
  adresse: { suivi: 'suivi-camille', pointage: 'fin-17' },
  revision: 7,
  elementId: 'moule-42',
  designation: 'M-042',
  operateurId: 'op-camille',
  datePremierPointage: '2026-09-14T08:00:00.123456789+02:00',
  nombrePointages: 3,
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
    const lecture = port.list({ nature: 'FIN_AUTOMATIQUE', operateur: 'Camille', element: 'OF', page: 2 });
    whenPageAnswers('FIN_AUTOMATIQUE', [finAutomatiqueFixture]);
    const page = await lecture;

    expect(page).toEqual({
      nature: 'FIN_AUTOMATIQUE',
      lignes: [
        {
          adresse: { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('debut-8') },
          element: new ElementAnomalieId('of-m24-0655'),
          designation: 'OF M24-0655',
          operateur: 'Camille Martin',
          poste: 'DMU 50',
          posteId: 'poste-dmu',
          debut: '2026-09-14T08:00:00.123456789+02:00',
          echeance: '2026-09-14T21:00:00.123456789+02:00',
        },
      ],
      total: 12,
      complete: true,
    });
  });

  it('should keep only the workstation reference when the operator and the workstation cannot be resolved, and none for work without workstation', async () => {
    const sansFiches = { ...finAutomatiqueFixture };
    delete sansFiches.operateur;
    delete sansFiches.poste;
    const sansPoste = { ...sansFiches };
    delete sansPoste.posteId;

    const lecture = port.list({ nature: 'FIN_AUTOMATIQUE', operateur: 'Camille', element: 'OF', page: 2 });
    whenPageAnswers('FIN_AUTOMATIQUE', [sansFiches, sansPoste]);
    const page = await lecture;

    expect(page.lignes).toMatchObject([
      { operateur: '', poste: '', posteId: 'poste-dmu' },
      { operateur: '', poste: '' },
    ]);
    expect(page.lignes[1]).not.toHaveProperty('posteId');
    expect(page.lignes[0]).not.toHaveProperty('operateurId');
  });

  it('should reject and report an incomplete page of automatic ends', async () => {
    const lecture = port
      .list({ nature: 'FIN_AUTOMATIQUE', operateur: 'Camille', element: 'OF', page: 2 })
      .catch((failure: unknown) => failure);

    whenPageAnswers('FIN_AUTOMATIQUE', [finAutomatiqueFixture], false);
    const failure = await lecture;

    expect(failure).toEqual(new Error('Lecture des anomalies incomplète.'));
    expect(errors.errors).toEqual([failure]);
  });

  it.each([
    { demandee: 'FIN_AUTOMATIQUE' as const, recue: conflitFixture },
    { demandee: 'CONFLIT' as const, recue: finAutomatiqueFixture },
    { demandee: 'FIN_AUTOMATIQUE' as const, recue: { ...finAutomatiqueFixture, nature: 'AUTRE' } },
  ])('should reject a $recue.nature line in a page requested as $demandee and report it once', async ({ demandee, recue }) => {
    const lecture = port.list({ nature: demandee, operateur: 'Camille', element: 'OF', page: 2 }).catch((failure: unknown) => failure);

    whenPageAnswers(demandee, [recue]);
    const failure = await lecture;

    expect(failure).toEqual(new Error('Ligne d’anomalie incohérente avec la nature demandée.'));
    expect(errors.errors).toEqual([failure]);
  });

  const whenPageAnswers = (nature: NatureAnomalie, lignes: object[], complete = true): void => {
    server.expectOne(`/api/atelier/anomalies?nature=${nature}&operateur=Camille&element=OF&page=1&size=5`).flush({
      lignes,
      total: 12,
      complete,
      page: 1,
      size: 5,
    });
  };
});
