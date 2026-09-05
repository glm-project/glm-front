import { JourneesDeTravailPort } from '@/app/atelier/domain/JourneesDeTravailPort';
import { RefusDAtelier } from '@/app/atelier/domain/RefusDAtelier';
import { ClientApi } from '@/app/shared/api-client/infrastructure/secondary/ClientApi';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HttpJourneesDeTravail } from './http/HttpJourneesDeTravail';

const identiteFixture = { id: '69f66e5e-7401-427a-8f63-5e458e43fa36', dateDeSurvenue: '2026-09-05T08:00:00Z' };
const JEAN = '0a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d';
const URL_DES_JOURNEES = '/api/atelier/journees';
const URL_DES_PRESENCES = '/api/atelier/journees/pointages';
const JOURNEE_DEJA_OUVERTE = 'cet operateur a deja une journee ouverte';
const DEJA_AU_TRAVAIL = 'une REPRISE suppose une PAUSE en cours';
const PAUSE_IMPOSSIBLE = 'une PAUSE suppose une journee ouverte et non interrompue';
const OPERATEUR_INCONNU = 'aucun operateur ne porte cet identifiant';
const SAISIE_CONCURRENTE = 'une autre saisie est passee avant';

type TourDuServeur = (requete: TestRequest) => void;

const acceptant: TourDuServeur = requete => requete.flush({}, { status: 201, statusText: 'Created' });

const refusant =
  (statut: number, code: string, message: string): TourDuServeur =>
  requete =>
    requete.flush(
      { type: `urn:glm:erreur:atelier:${code}`, title: code.replaceAll('-', ' '), status: statut, message },
      { status: statut, statusText: 'Refused' },
    );

const adapters: [string, () => JourneesDeTravailPort][] = [['http', () => TestBed.inject(HttpJourneesDeTravail)]];

describe.each(adapters)('JourneesDeTravailPort contract, honoured by %s', (_adapter, buildJournees) => {
  let journees: JourneesDeTravailPort;
  let serveur: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), ClientApi, HttpJourneesDeTravail] });
    journees = buildJournees();
    serveur = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    serveur.verify();
  });

  it('should open the working day of an operator arriving in the morning', async () => {
    const arrivee = journees.ensureOperateurArrived(JEAN, identiteFixture);

    const requete = await whenTheServerAnswersOn(URL_DES_JOURNEES, acceptant);

    thenItSent(requete, { operateur: JEAN });
    await arrivee;
  });

  it('should hand back when the working day it has to make sure of is already open', async () => {
    const arrivee = journees.ensureOperateurArrived(JEAN, identiteFixture);

    await whenTheServerAnswersOn(URL_DES_JOURNEES, refusant(409, 'journee-de-travail-deja-ouverte', JOURNEE_DEJA_OUVERTE));

    await expect(arrivee).resolves.toBeUndefined();
  });

  it('should refuse an arrival for an operator the referential does not hold', async () => {
    const echec = echecDe(journees.ensureOperateurArrived(JEAN, identiteFixture));

    await whenTheServerAnswersOn(URL_DES_JOURNEES, refusant(404, 'operateur-introuvable', OPERATEUR_INCONNU));

    thenItWasRefused(await echec, 'operateur-introuvable', OPERATEUR_INCONNU);
  });

  it('should put an operator back at work when he comes off a break', async () => {
    const reprise = journees.ensureOperateurPresent(JEAN, identiteFixture);

    const requete = await whenTheServerAnswersOn(URL_DES_PRESENCES, acceptant);

    thenItSent(requete, { operateur: JEAN, type: 'REPRISE' });
    await reprise;
  });

  it('should hand back when the operator it has to make sure of is already at work', async () => {
    const reprise = journees.ensureOperateurPresent(JEAN, identiteFixture);

    await whenTheServerAnswersOn(URL_DES_PRESENCES, refusant(409, 'transition-de-presence-interdite', DEJA_AU_TRAVAIL));

    await expect(reprise).resolves.toBeUndefined();
  });

  it('should refuse the very same transition when it is asked for as a gesture of its own', async () => {
    const echec = echecDe(journees.recordPresence(JEAN, 'PAUSE', identiteFixture));

    await whenTheServerAnswersOn(URL_DES_PRESENCES, refusant(409, 'transition-de-presence-interdite', PAUSE_IMPOSSIBLE));

    thenItWasRefused(await echec, 'transition-de-presence-interdite', PAUSE_IMPOSSIBLE);
  });

  it('should record the departure that closes the working day', async () => {
    const depart = journees.recordPresence(JEAN, 'DEPART', identiteFixture);

    const requete = await whenTheServerAnswersOn(URL_DES_PRESENCES, acceptant);

    thenItSent(requete, { operateur: JEAN, type: 'DEPART' });
    await depart;
  });

  it('should replay a presence another entry slipped in front of, and record it', async () => {
    const pause = journees.recordPresence(JEAN, 'PAUSE', identiteFixture);

    await whenTheServerAnswersOn(URL_DES_PRESENCES, refusant(409, 'saisie-concurrente', SAISIE_CONCURRENTE));
    await whenTheServerAnswersOn(`/api/atelier/journees?operateur=${JEAN}&size=100`, acceptant);
    const rejeu = await whenTheServerAnswersOn(URL_DES_PRESENCES, acceptant);

    thenItSent(rejeu, { operateur: JEAN, type: 'PAUSE' });
    await pause;
  });

  it.each(['arrival', 'implicit resumption'])('should reread a concurrent %s before replaying', async gesture => {
    let pending: Promise<void>;
    let route: string;
    if (gesture === 'arrival') {
      pending = journees.ensureOperateurArrived(JEAN, identiteFixture);
      route = URL_DES_JOURNEES;
    } else {
      pending = journees.ensureOperateurPresent(JEAN, identiteFixture);
      route = URL_DES_PRESENCES;
    }

    await whenTheServerAnswersOn(route, refusant(409, 'saisie-concurrente', SAISIE_CONCURRENTE));
    await whenTheServerAnswersOn(`/api/atelier/journees?operateur=${JEAN}&size=100`, acceptant);
    await whenTheServerAnswersOn(route, acceptant);

    await expect(pending).resolves.toBeUndefined();
  });

  const unTourDeBoucle = (): Promise<void> => new Promise(resolve => setTimeout(resolve));

  const echecDe = (envoi: Promise<void>): Promise<unknown> =>
    envoi.then(
      () => undefined,
      (echec: unknown) => echec,
    );

  const whenTheServerAnswersOn = async (url: string, tour: TourDuServeur): Promise<TestRequest> => {
    await unTourDeBoucle();

    const requete = serveur.expectOne(url);
    tour(requete);

    return requete;
  };

  const thenItSent = (requete: TestRequest, body: unknown): void => {
    expect(requete.request.body).toEqual({ ...(body as object), ...identiteFixture });
  };

  const thenItWasRefused = (echec: unknown, code: string, message: string): void => {
    expect(echec).toBeInstanceOf(RefusDAtelier);
    expect((echec as RefusDAtelier).code).toBe(code);
    expect((echec as RefusDAtelier).message).toBe(message);
  };
});
