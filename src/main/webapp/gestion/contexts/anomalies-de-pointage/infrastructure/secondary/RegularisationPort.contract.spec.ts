import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { ActiviteAnomalieId } from '../../domain/dossier/ActiviteAnomalieId';
import { SuiviAnomalieId } from '../../domain/dossier/SuiviAnomalieId';
import { CommandeDeRegularisation, RegularisationPort, ResultatDeRegularisation } from '../../domain/regularisation/RegularisationPort';
import { HttpRegularisation } from './HttpRegularisation';

const commandeFixture: CommandeDeRegularisation = {
  suivi: new SuiviAnomalieId('suivi-camille'),
  id: 'saisie-1',
  activite: new ActiviteAnomalieId('travail-8'),
  dateDeSurvenue: '2026-09-14T17:00:00-03:00',
};

const suiviRegulariseFixture = { id: 'suivi-camille' };

describe('Beyond the contract: HTTP regularisation of an automatic end', () => {
  let port: RegularisationPort;
  let server: HttpTestingController;
  let errors: ErrorHandlerFixture;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ApiClient,
        { provide: ErrorHandlerPort, useClass: ErrorHandlerFixture },
        { provide: RegularisationPort, useClass: HttpRegularisation },
      ],
    });
    port = TestBed.inject(RegularisationPort);
    server = TestBed.inject(HttpTestingController);
    errors = TestBed.inject(ErrorHandlerPort) as ErrorHandlerFixture;
  });

  afterEach(() => {
    server.verify();
  });

  it('should send the identifier of the entry, the activity and the hour of the end to the regularisations of the suivi', async () => {
    const envoi = await whenRegularisingAnsweredWith(201, suiviRegulariseFixture);

    thenTheRegularisationSentIs(envoi.requete, {
      id: 'saisie-1',
      activite: 'travail-8',
      dateDeSurvenue: '2026-09-14T17:00:00-03:00',
    });
  });

  it.each([
    { cas: 'the end is regularised', status: 201 },
    { cas: 'the same entry is sent again and already stands in the journal', status: 200 },
  ])('should accept the regularisation when $cas', async ({ status }) => {
    const envoi = await whenRegularisingAnsweredWith(status, suiviRegulariseFixture);

    expect(envoi.resultat).toEqual({ kind: 'REGULARISEE' });
  });

  it.each([
    { code: 'activite-visee-introuvable', status: 404 },
    { code: 'activite-deja-regularisee', status: 409 },
    { code: 'activite-non-echue', status: 409 },
    { code: 'date-de-survenue-future', status: 400 },
    { code: 'fin-avant-debut', status: 409 },
    { code: 'fin-apres-borne', status: 409 },
    { code: 'operateur-non-habilite', status: 409 },
    { code: 'operateur-introuvable', status: 404 },
    { code: 'poste-de-travail-introuvable', status: 404 },
  ] as const)('should resolve the refusal $code as a refusal of the regularisation and report nothing', async ({ code, status }) => {
    const envoi = await whenRegularisingAnsweredWith(status, { type: `urn:glm:erreur:atelier:${code}` });

    expect(envoi.resultat).toEqual({ kind: 'REFUS', code });
    expect(errors.errors).toEqual([]);
  });

  it('should resolve a concurrent entry as a concurrence to reread and report nothing', async () => {
    const envoi = await whenRegularisingAnsweredWith(409, { type: 'urn:glm:erreur:atelier:saisie-concurrente' });

    expect(envoi.resultat).toEqual({ kind: 'CONCURRENCE' });
    expect(errors.errors).toEqual([]);
  });

  it.each([
    { cas: 'an unknown business code', status: 409, corps: { type: 'urn:glm:erreur:atelier:pointage-ignore' } },
    { cas: 'a server failure with no business code', status: 500, corps: {} },
  ])('should reject and report once $cas instead of taking it for a refusal', async ({ status, corps }) => {
    const rejet = await whenRegularisingRejectedWith(status, corps);

    expect(rejet).toBeInstanceOf(HttpErrorResponse);
    expect(errors.errors).toEqual([rejet]);
  });

  interface EnvoiDeRegularisation {
    readonly requete: TestRequest;
    readonly resultat: ResultatDeRegularisation;
  }

  const whenRegularisingAnsweredWith = async (status: number, corps: object): Promise<EnvoiDeRegularisation> => {
    const resultat = port.regulariser(commandeFixture);
    const requete = server.expectOne('/api/atelier/suivis/suivi-camille/regularisations');
    requete.flush(corps, { status, statusText: 'Answered' });
    return { requete, resultat: await resultat };
  };

  const whenRegularisingRejectedWith = async (status: number, corps: object): Promise<unknown> => {
    const rejet = port.regulariser(commandeFixture).catch((failure: unknown) => failure);
    server.expectOne('/api/atelier/suivis/suivi-camille/regularisations').flush(corps, { status, statusText: 'Failed' });
    return rejet;
  };

  const thenTheRegularisationSentIs = (requete: TestRequest, corps: object): void => {
    expect(requete.request.method).toBe('POST');
    expect(requete.request.body).toEqual(corps);
  };
});
