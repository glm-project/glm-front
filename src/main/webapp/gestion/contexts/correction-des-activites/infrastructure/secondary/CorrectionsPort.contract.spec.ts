import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import {
  activiteTerminee,
  elementFixture,
  fraiseuseFixture,
  instantLocal,
  journeeFixture,
  portionsDuLundiFixture,
  terminee,
  tourFixture,
} from '@test/unit/fixtures/gestion/correction-des-activites/JourneeACorrigerFixture';
import { requiredFixture } from '@test/utils/RequiredFixture';
import { ContenuDAjout } from '../../domain/correction/ContenuDAjout';
import { CorrectionsPort, MotifDAjout, MotifDeChangementDePoste, ResultatDeCorrection } from '../../domain/correction/CorrectionsPort';
import { IntervalleDAjout } from '../../domain/correction/IntervalleDAjout';
import { SaisieDAjout } from '../../domain/correction/SaisieDAjout';
import { SaisieDeChangementDePoste } from '../../domain/correction/SaisieDeChangementDePoste';
import { SaisieDeRetrait } from '../../domain/correction/SaisieDeRetrait';
import { InstantDeLaJournee } from '../../domain/journee/InstantDeLaJournee';
import { SuiviDAtelierId } from '../../domain/journee/SuiviDAtelierId';
import { HttpCorrections } from './HttpCorrections';

const JOURNEE = journeeFixture({
  jour: 5,
  suivis: [{ suivi: 'suivi-1', element: elementFixture('1') }],
  activites: [
    {
      id: 'debut-8',
      suivi: 'suivi-1',
      poste: tourFixture,
      debut: instantLocal(5, 18, 30),
      etat: terminee(instantLocal(5, 21, 45), 'PT3H15M'),
    },
  ],
});
const RETRAIT = SaisieDeRetrait.pour(undefined, activiteTerminee(JOURNEE, 'debut-8'), () => 'saisie-1');
const CHANGEMENT = SaisieDeChangementDePoste.pour(undefined, activiteTerminee(JOURNEE, 'debut-8'), fraiseuseFixture, () => 'saisie-2');
const CONTENU_DE_L_AJOUT = ContenuDAjout.de(
  JOURNEE.operateur,
  requiredFixture(JOURNEE.choix.suivis.de(new SuiviDAtelierId('suivi-1')), 'suivi-1'),
  tourFixture,
  'NON_CONFORMITE',
  portionsDuLundiFixture(
    requiredFixture(
      IntervalleDAjout.entre(new InstantDeLaJournee('2026-10-05T13:30:00-03:00'), new InstantDeLaJournee('2026-10-05T16:45:00-03:00')),
      'intervalle',
    ),
  ),
);
const AJOUT = SaisieDAjout.pour(undefined, CONTENU_DE_L_AJOUT, () => 'saisie-3');
const URL_DE_L_AJOUT = '/api/atelier/suivis/suivi-1/activites';
const URL_DU_CHANGEMENT = '/api/atelier/suivis/suivi-1/activites/debut-8/poste';
const URL_DU_RETRAIT = '/api/atelier/suivis/suivi-1/activites/debut-8/retrait';

describe('Beyond the contract: HTTP corrections of the activities', () => {
  let port: CorrectionsPort;
  let server: HttpTestingController;
  let errors: ErrorHandlerFixture;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ApiClient,
        { provide: ErrorHandlerPort, useClass: ErrorHandlerFixture },
        { provide: CorrectionsPort, useClass: HttpCorrections },
      ],
    });
    port = TestBed.inject(CorrectionsPort);
    server = TestBed.inject(HttpTestingController);
    errors = TestBed.inject(ErrorHandlerPort) as ErrorHandlerFixture;
  });

  afterEach(() => {
    server.verify();
  });

  it('should send the identifier of the entry to the removal of the activity of the suivi', async () => {
    const envoi = await whenRemovingAnsweredWith(201, {});

    thenTheRemovalSentIs(envoi.requete, { id: 'saisie-1' });
  });

  it.each([
    { cas: 'the removal is recorded', status: 201 },
    { cas: 'the same entry is sent again and already stands in the journal', status: 200 },
  ])('should record the removal when $cas', async ({ status }) => {
    const envoi = await whenRemovingAnsweredWith(status, {});

    expect(envoi.resultat).toEqual({ kind: 'ENREGISTREE' });
  });

  it.each([
    { code: 'saisie-concurrente', status: 409 },
    { code: 'suivi-d-atelier-introuvable', status: 404 },
    { code: 'activite-visee-introuvable', status: 404 },
    { code: 'evenement-posterieur-a-la-cloture', status: 409 },
  ] as const)('should resolve $code as a change of the day, to reread, and report nothing', async ({ code, status }) => {
    const envoi = await whenRemovingAnsweredWith(status, { type: `urn:glm:erreur:atelier:${code}` });

    expect(envoi.resultat).toEqual({ kind: 'JOURNEE_CHANGEE' });
    expect(errors.errors).toEqual([]);
  });

  it.each([
    {
      cas: 'an activity in progress, which the page never offers to remove',
      status: 409,
      corps: { type: 'urn:glm:erreur:atelier:activite-en-cours' },
    },
    { cas: 'an unknown business code', status: 409, corps: { type: 'urn:glm:erreur:atelier:pointage-ignore' } },
    { cas: 'a server failure with no business code', status: 500, corps: {} },
  ])('should reject and report once $cas instead of taking it for a change of the day', async ({ status, corps }) => {
    const rejet = await whenRemovingRejectedWith(status, corps);

    expect(rejet).toBeInstanceOf(HttpErrorResponse);
    expect(errors.errors).toEqual([rejet]);
  });

  it('should send the identifier of the entry and the new workstation to the change of workstation of the activity of the suivi', async () => {
    const envoi = await whenChangingTheWorkstationAnsweredWith(201, {});

    thenTheChangeSentIs(envoi.requete, { id: 'saisie-2', poste: 'poste-fraise' });
  });

  it.each([
    { cas: 'the change is recorded', status: 201 },
    { cas: 'the same entry is sent again and already stands in the journal', status: 200 },
  ])('should record the change of workstation when $cas', async ({ status }) => {
    const envoi = await whenChangingTheWorkstationAnsweredWith(status, {});

    expect(envoi.resultat).toEqual({ kind: 'ENREGISTREE' });
  });

  it('should resolve an overlap on the new workstation as a refusal the manager can correct, and report nothing', async () => {
    const envoi = await whenChangingTheWorkstationAnsweredWith(409, { type: 'urn:glm:erreur:atelier:chevauchement' });

    expect(envoi.resultat).toEqual({ kind: 'REFUS', motif: 'CHEVAUCHEMENT' });
    expect(errors.errors).toEqual([]);
  });

  it.each([
    { code: 'saisie-concurrente', status: 409 },
    { code: 'suivi-d-atelier-introuvable', status: 404 },
    { code: 'activite-visee-introuvable', status: 404 },
    { code: 'poste-de-travail-introuvable', status: 404 },
    { code: 'operateur-non-habilite', status: 409 },
    { code: 'meme-poste', status: 409 },
    { code: 'evenement-posterieur-a-la-cloture', status: 409 },
  ] as const)(
    'should resolve $code on a change of workstation as a change of the day, to reread, and report nothing',
    async ({ code, status }) => {
      const envoi = await whenChangingTheWorkstationAnsweredWith(status, { type: `urn:glm:erreur:atelier:${code}` });

      expect(envoi.resultat).toEqual({ kind: 'JOURNEE_CHANGEE' });
      expect(errors.errors).toEqual([]);
    },
  );

  it.each([
    {
      cas: 'an activity in progress, which the page never offers to change',
      status: 409,
      corps: { type: 'urn:glm:erreur:atelier:activite-en-cours' },
    },
    { cas: 'an unknown business code', status: 409, corps: { type: 'urn:glm:erreur:atelier:pointage-ignore' } },
    { cas: 'a server failure with no business code', status: 500, corps: {} },
  ])('should reject and report once $cas on a change of workstation', async ({ status, corps }) => {
    const rejet = await whenChangingTheWorkstationRejectedWith(status, corps);

    expect(rejet).toBeInstanceOf(HttpErrorResponse);
    expect(errors.errors).toEqual([rejet]);
  });

  it('should send the entry, the operator, the workstation, the type and the hours with their local offset to the activities of the suivi', async () => {
    const envoi = await whenAddingAnsweredWith(201, {});

    thenTheAdditionSentIs(envoi.requete, {
      id: 'saisie-3',
      operateur: 'op-1',
      poste: 'poste-tour',
      categorie: 'NON_CONFORMITE',
      debut: '2026-10-05T13:30:00-03:00',
      fin: '2026-10-05T16:45:00-03:00',
    });
  });

  it.each([
    { cas: 'the activity is added', status: 201 },
    { cas: 'the same entry is sent again and already stands in the journal', status: 200 },
  ])('should record the addition when $cas', async ({ status }) => {
    const envoi = await whenAddingAnsweredWith(status, {});

    expect(envoi.resultat).toEqual({ kind: 'ENREGISTREE' });
  });

  it.each([
    { code: 'chevauchement', status: 409, motif: 'CHEVAUCHEMENT' },
    { code: 'date-de-survenue-future', status: 400, motif: 'FIN_FUTURE' },
  ] as const)(
    'should resolve $code on an addition as a refusal the manager can correct, and report nothing',
    async ({ code, status, motif }) => {
      const envoi = await whenAddingAnsweredWith(status, { type: `urn:glm:erreur:atelier:${code}` });

      expect(envoi.resultat).toEqual({ kind: 'REFUS', motif });
      expect(errors.errors).toEqual([]);
    },
  );

  it.each([
    { code: 'saisie-concurrente', status: 409 },
    { code: 'suivi-d-atelier-introuvable', status: 404 },
    { code: 'operateur-introuvable', status: 404 },
    { code: 'poste-de-travail-introuvable', status: 404 },
    { code: 'operateur-non-habilite', status: 409 },
    { code: 'evenement-anterieur-a-l-engagement', status: 409 },
    { code: 'evenement-posterieur-a-la-cloture', status: 409 },
  ] as const)('should resolve $code on an addition as a change of the day, to reread, and report nothing', async ({ code, status }) => {
    const envoi = await whenAddingAnsweredWith(status, { type: `urn:glm:erreur:atelier:${code}` });

    expect(envoi.resultat).toEqual({ kind: 'JOURNEE_CHANGEE' });
    expect(errors.errors).toEqual([]);
  });

  it.each([
    {
      cas: 'an end that does not follow the start, which the screen prevents',
      status: 409,
      corps: { type: 'urn:glm:erreur:atelier:fin-avant-debut' },
    },
    { cas: 'an unknown business code', status: 409, corps: { type: 'urn:glm:erreur:atelier:pointage-ignore' } },
    { cas: 'a server failure with no business code', status: 500, corps: {} },
  ])('should reject and report once $cas on an addition', async ({ status, corps }) => {
    const rejet = await whenAddingRejectedWith(status, corps);

    expect(rejet).toBeInstanceOf(HttpErrorResponse);
    expect(errors.errors).toEqual([rejet]);
  });

  interface EnvoiDAjout {
    readonly requete: TestRequest;
    readonly resultat: ResultatDeCorrection<MotifDAjout>;
  }

  const whenAddingAnsweredWith = async (status: number, corps: object): Promise<EnvoiDAjout> => {
    const resultat = port.ajouter(AJOUT);
    const requete = server.expectOne(URL_DE_L_AJOUT);
    requete.flush(corps, { status, statusText: 'Answered' });
    return { requete, resultat: await resultat };
  };

  const whenAddingRejectedWith = async (status: number, corps: object): Promise<unknown> => {
    const rejet = port.ajouter(AJOUT).catch((failure: unknown) => failure);
    server.expectOne(URL_DE_L_AJOUT).flush(corps, { status, statusText: 'Failed' });
    return rejet;
  };

  const thenTheAdditionSentIs = (requete: TestRequest, corps: object): void => {
    expect(requete.request.method).toBe('POST');
    expect(requete.request.body).toEqual(corps);
  };

  interface EnvoiDeChangement {
    readonly requete: TestRequest;
    readonly resultat: ResultatDeCorrection<MotifDeChangementDePoste>;
  }

  const whenChangingTheWorkstationAnsweredWith = async (status: number, corps: object): Promise<EnvoiDeChangement> => {
    const resultat = port.changerDePoste(CHANGEMENT);
    const requete = server.expectOne(URL_DU_CHANGEMENT);
    requete.flush(corps, { status, statusText: 'Answered' });
    return { requete, resultat: await resultat };
  };

  const whenChangingTheWorkstationRejectedWith = async (status: number, corps: object): Promise<unknown> => {
    const rejet = port.changerDePoste(CHANGEMENT).catch((failure: unknown) => failure);
    server.expectOne(URL_DU_CHANGEMENT).flush(corps, { status, statusText: 'Failed' });
    return rejet;
  };

  const thenTheChangeSentIs = (requete: TestRequest, corps: object): void => {
    expect(requete.request.method).toBe('POST');
    expect(requete.request.body).toEqual(corps);
  };

  interface EnvoiDeRetrait {
    readonly requete: TestRequest;
    readonly resultat: ResultatDeCorrection;
  }

  const whenRemovingAnsweredWith = async (status: number, corps: object): Promise<EnvoiDeRetrait> => {
    const resultat = port.retirer(RETRAIT);
    const requete = server.expectOne(URL_DU_RETRAIT);
    requete.flush(corps, { status, statusText: 'Answered' });
    return { requete, resultat: await resultat };
  };

  const whenRemovingRejectedWith = async (status: number, corps: object): Promise<unknown> => {
    const rejet = port.retirer(RETRAIT).catch((failure: unknown) => failure);
    server.expectOne(URL_DU_RETRAIT).flush(corps, { status, statusText: 'Failed' });
    return rejet;
  };

  const thenTheRemovalSentIs = (requete: TestRequest, corps: object): void => {
    expect(requete.request.method).toBe('POST');
    expect(requete.request.body).toEqual(corps);
  };
});
