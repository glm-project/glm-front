import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { DossierDeLaFin, LectureDuDossierDeLaFin } from '../../domain/fin-automatique/DossierDeLaFin';
import { DossierDeLaFinPort } from '../../domain/fin-automatique/DossierDeLaFinPort';
import { PointageDuDossierId } from '../../domain/fin-automatique/PointageDuDossierId';
import { ActiviteDeLaJourneeId } from '../../domain/journee/ActiviteDeLaJourneeId';
import { SuiviDAtelierId } from '../../domain/journee/SuiviDAtelierId';
import { HttpDossierDeLaFin } from './HttpDossierDeLaFin';

type RestEvenement = components['schemas']['RestEvenementDAtelier'];

const SUIVI = new SuiviDAtelierId('suivi-1');
const ACTIVITE = new ActiviteDeLaJourneeId('debut-2');
const URL_DU_DOSSIER = '/api/atelier/suivis/suivi-1/anomalies/debut-2';

const restPointage = (id: string, type: RestEvenement['type'], dateDeSurvenue: string): RestEvenement => ({
  id,
  type,
  activite: 'debut-2',
  operateurId: 'op-1',
  operateur: { id: 'op-1', nom: 'Dupont', prenom: 'Jean' },
  posteId: 'poste-fraise',
  poste: { id: 'poste-fraise', libelle: 'DMU 50' },
  auteur: 'jean',
  dateDeSurvenue,
  dateDEnregistrement: dateDeSurvenue,
  estUneRegularisation: false,
});

const restDossierFixture = (): components['schemas']['RestDossierAnomalie'] => ({
  adresse: { suivi: 'suivi-1', pointage: 'debut-2' },
  elementId: 'element-1',
  designation: 'Carter 1',
  revision: 4,
  evaluation: '2026-10-06T08:00:00Z',
  borneDeFin: '2026-10-06T06:00:00Z',
  activite: {
    evenement: 'debut-2',
    activite: 'debut-2',
    operateurId: 'op-1',
    posteId: 'poste-fraise',
    categorie: 'NON_CONFORMITE',
    debut: '2026-10-05T20:00:00.123456789Z',
    fin: '2026-10-06T01:30:00Z',
    duree: 'PT5H30M',
  },
  pointages: [
    restPointage('debut-2', 'NON_CONFORMITE', '2026-10-05T20:00:00.123456789Z'),
    restPointage('debut-3', 'DEBUT', '2026-10-06T06:00:00Z'),
  ],
});

const dossierDomaine = (): DossierDeLaFin => ({
  journal: [
    { id: new PointageDuDossierId('debut-2'), fait: { type: 'NON_CONFORMITE', instant: '2026-10-05T20:00:00.123456789Z' } },
    { id: new PointageDuDossierId('debut-3'), fait: { type: 'DEBUT', instant: '2026-10-06T06:00:00Z' } },
  ],
  activite: {
    id: new ActiviteDeLaJourneeId('debut-2'),
    ouvrant: new PointageDuDossierId('debut-2'),
    categorie: 'NON_CONFORMITE',
    debut: '2026-10-05T20:00:00.123456789Z',
    echeance: '2026-10-06T01:30:00Z',
  },
  borneDeFin: '2026-10-06T06:00:00Z',
});

describe('Beyond the contract: HTTP reading of the dossier of an automatic end', () => {
  let port: DossierDeLaFinPort;
  let server: HttpTestingController;
  let errors: ErrorHandlerFixture;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ApiClient,
        { provide: ErrorHandlerPort, useClass: ErrorHandlerFixture },
        { provide: DossierDeLaFinPort, useClass: HttpDossierDeLaFin },
      ],
    });
    port = TestBed.inject(DossierDeLaFinPort);
    server = TestBed.inject(HttpTestingController);
    errors = TestBed.inject(ErrorHandlerPort) as ErrorHandlerFixture;
  });

  afterEach(() => {
    server.verify();
  });

  it('should read the expired activity, the pointages of its key and the bound of the end, with the exact received instants', async () => {
    const lecture = await whenReadingAnsweredWith(restDossierFixture());

    expect(lecture).toEqual({ kind: 'DOSSIER', dossier: dossierDomaine() });
    expect(errors.errors).toEqual([]);
  });

  it.each(['RETRAIT', 'CHANGEMENT_DE_POSTE'] as const)('should leave a %s fact of the manager out of the pointages', async type => {
    const dossier = restDossierFixture();
    dossier.pointages = [...dossier.pointages, { ...restPointage('fait-9', type, '2026-10-06T07:00:00Z'), activiteVisee: 'debut-2' }];

    const lecture = await whenReadingAnsweredWith(dossier);

    expect(dossierFrom(lecture).journal.map(pointage => pointage.id)).toEqual([
      new PointageDuDossierId('debut-2'),
      new PointageDuDossierId('debut-3'),
    ]);
  });

  it('should keep no bound of the end when nothing bounds it', async () => {
    const dossier = restDossierFixture();
    delete dossier.borneDeFin;

    const lecture = await whenReadingAnsweredWith(dossier);

    expect(dossierFrom(lecture)).not.toHaveProperty('borneDeFin');
  });

  it.each(['suivi-d-atelier-introuvable', 'fin-automatique-introuvable'])(
    'should resolve a dossier that does not exist (%s) as a known absence and report nothing',
    async code => {
      const lecture = await whenReadingRefusedWith(404, code);

      expect(lecture).toEqual({ kind: 'INTROUVABLE' });
      expect(errors.errors).toEqual([]);
    },
  );

  it('should report a failed read once and reject', async () => {
    const failure = await whenReadingRefusedWith(500, 'technique').catch((failure: unknown) => failure);

    expect(failure).toBeInstanceOf(HttpErrorResponse);
    expect(errors.errors).toEqual([failure]);
  });

  it('should report a read that fails without any problem detail once and reject', async () => {
    const failure = await whenTheNetworkFails().catch((failure: unknown) => failure);

    expect(failure).toBeInstanceOf(HttpErrorResponse);
    expect(errors.errors).toEqual([failure]);
  });

  const whenTheNetworkFails = async (): Promise<LectureDuDossierDeLaFin> => {
    const lecture = port.lire(SUIVI, ACTIVITE);
    lecture.catch(() => undefined);
    server.expectOne(URL_DU_DOSSIER).error(new ProgressEvent('error'));
    return lecture;
  };

  const whenReadingAnsweredWith = async (dossier: components['schemas']['RestDossierAnomalie']): Promise<LectureDuDossierDeLaFin> => {
    const lecture = port.lire(SUIVI, ACTIVITE);
    const requete = server.expectOne(URL_DU_DOSSIER);
    expect(requete.request.method).toBe('GET');
    requete.flush(dossier);
    return lecture;
  };

  const whenReadingRefusedWith = async (status: number, code: string): Promise<LectureDuDossierDeLaFin> => {
    const lecture = port.lire(SUIVI, ACTIVITE);
    lecture.catch(() => undefined);
    server.expectOne(URL_DU_DOSSIER).flush({ type: `urn:glm:erreur:atelier:${code}` }, { status, statusText: 'Refused' });
    return lecture;
  };

  const dossierFrom = (lecture: LectureDuDossierDeLaFin): DossierDeLaFin => {
    if (lecture.kind !== 'DOSSIER') throw new Error('Missing dossier fixture');
    return lecture.dossier;
  };
});
