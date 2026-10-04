import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { ApplicationActePort, PrevisualisationConflitPort } from '@/gestion/contexts/resolution-conflits/domain/acte/ConflitsActesPorts';
import { ConflitsReadPort } from '@/gestion/contexts/resolution-conflits/domain/dossier/ConflitsReadPort';
import { ConflitsRightsPort } from '@/gestion/contexts/resolution-conflits/domain/dossier/ConflitsRightsPort';
import { PointageConflitId } from '@/gestion/contexts/resolution-conflits/domain/dossier/PointageConflitId';
import { SuiviConflitId } from '@/gestion/contexts/resolution-conflits/domain/dossier/SuiviConflitId';
import { resolutionConflitsProvider } from '@/gestion/resolution-conflits.provider';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';

describe('Real conflict resolution composition', () => {
  let server: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ...resolutionConflitsProvider,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ConflitsRightsPort, useValue: { canApply: () => true } },
        { provide: ErrorHandlerPort, useClass: ErrorHandlerFixture },
      ],
    });
    server = TestBed.inject(HttpTestingController);
  });

  afterEach(() => server.verify());

  it('should use the same-origin API for reading, previewing and confirming through the public ports', async () => {
    const resultat = await whenUsingThePublicResolutionPorts();

    expect(resultat.lecture).toEqual({ lignes: [], total: 0, complete: true });
    expect(resultat.apercu).toEqual({ kind: 'REFUS', raison: 'Aperçu invalide' });
    expect(resultat.confirmation).toEqual({ kind: 'ISSUE_INCONNUE' });
  });

  const whenUsingThePublicResolutionPorts = async () => {
    const adresse = { suivi: new SuiviConflitId('suivi-camille'), pointage: new PointageConflitId('fin-17') };
    const lecture = TestBed.inject(ConflitsReadPort).list({ operateur: '', element: '', page: 1 });
    server
      .expectOne('/api/atelier/conflits?operateur=&element=&page=0&size=5')
      .flush({ lignes: [], total: 0, complete: true, page: 0, size: 5 });
    const resultatLecture = await lecture;
    const apercu = TestBed.inject(PrevisualisationConflitPort).preview(adresse, 1, {
      kind: 'ANNULATION',
      pointage: 'fin-17',
      motif: 'Double appui',
    });
    server
      .expectOne('/api/atelier/suivis/suivi-camille/conflits/fin-17/apercus')
      .flush({ type: 'urn:glm:erreur:atelier:apercu-invalide', message: 'Aperçu invalide' }, { status: 400, statusText: 'Invalid' });
    const resultatApercu = await apercu;
    const confirmation = TestBed.inject(ApplicationActePort).apply({ adresse, version: 1, commande: 'commande-1', reference: 'opaque' });
    server.expectOne('/api/atelier/suivis/suivi-camille/confirmations-de-resolution').flush({ kind: 'NON_ATTESTEE' });
    return { lecture: resultatLecture, apercu: resultatApercu, confirmation: await confirmation };
  };
});
