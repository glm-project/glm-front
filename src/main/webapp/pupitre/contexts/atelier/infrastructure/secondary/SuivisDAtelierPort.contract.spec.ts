import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { Page } from '@/app/shared/pagination/domain/Page';
import { ETATS_EN_ATELIER } from '@/pupitre/contexts/atelier/domain/EtatDAtelier';
import { RefusDAtelier } from '@/pupitre/contexts/atelier/domain/RefusDAtelier';
import { SuiviDAtelier } from '@/pupitre/contexts/atelier/domain/SuiviDAtelier';
import { Pointage, SuivisDAtelierPort } from '@/pupitre/contexts/atelier/domain/SuivisDAtelierPort';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HttpSuivisDAtelier } from './http/HttpSuivisDAtelier';

type RestSuiviDAtelier = components['schemas']['RestSuiviDAtelier'];
type RestSuiviDAtelierEnGrille = components['schemas']['RestSuiviDAtelierEnGrille'];

const PAGE_PAR_DEFAUT_DU_SERVEUR = 20;
const PAGE_MAXIMALE_DU_SERVEUR = 100;
const TOUT_UN_ATELIER = 60;
const PLUS_QUE_LE_SERVEUR_N_EN_REND = 137;
const identiteFixture = { id: '69f66e5e-7401-427a-8f63-5e458e43fa36', dateDeSurvenue: '2026-09-05T08:00:00Z' };
const JEAN = '0a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d';
const MARIE = '9f8e7d6c-5b4a-3210-9876-543210fedcba';
const HUIT_HEURES = '2026-05-11T06:00:00Z';
const NEUF_HEURES_TRENTE = new Date('2026-05-11T07:30:00Z');
const UNE_HEURE_ET_DEMIE = 90 * 60 * 1000;
const ENGAGEMENT = {
  activitesEnCours: [],
  element: '4b163228-dadd-4819-b022-1c88583e2b5c',
  engageLe: '2026-05-11T05:30:00Z',
  engagePar: 'gestionnaire.impeccmold',
};

const TOUR_1 = { id: '11111111-2222-3333-4444-555555555555', libelle: 'Tour 1', nature: 'tournage' };
const JEAN_DUPONT = { id: JEAN, nom: 'Dupont', prenom: 'Jean' };
const MARIE_MARTIN = { id: MARIE, nom: 'Martin', prenom: 'Marie' };

const UN_ELEMENT_QUE_PERSONNE_N_A_COMMENCE = {
  ...ENGAGEMENT,
  id: 'b7f0c2de-1f2a-4c3b-9d4e-5f6a7b8c9d0e',
  nom: 'OF-2026-000042',
  etat: 'EN_ATTENTE',
  type: 'ORDRE_DE_FABRICATION',
} satisfies RestSuiviDAtelierEnGrille;

const UN_ELEMENT_QUE_JEAN_TRAVAILLE = {
  ...ENGAGEMENT,
  id: 'c8e1d3ef-2a3b-4d5c-8e9f-0a1b2c3d4e5f',
  nom: 'OF-2026-000043',
  etat: 'EN_COURS',
  type: 'PRODUIT',
  activitesEnCours: [
    { operateur: MARIE_MARTIN, categorie: 'NON_CONFORMITE', depuis: HUIT_HEURES, poste: TOUR_1 },
    { operateur: JEAN_DUPONT, categorie: 'TRAVAIL', depuis: HUIT_HEURES, poste: TOUR_1 },
  ],
} satisfies RestSuiviDAtelierEnGrille;

const UN_ELEMENT_TRAVAILLE_SANS_MACHINE = {
  ...ENGAGEMENT,
  id: 'd9f2e4a0-3b4c-5e6d-9f0a-1b2c3d4e5f60',
  nom: 'OF-2026-000044',
  etat: 'EN_COURS',
  type: 'ORDRE_DE_FABRICATION',
  activitesEnCours: [{ operateur: JEAN_DUPONT, categorie: 'TRAVAIL', depuis: HUIT_HEURES }],
} satisfies RestSuiviDAtelierEnGrille;

const UN_ELEMENT_CLOTURE = {
  ...ENGAGEMENT,
  id: 'e0a3f5b1-4c5d-6f70-a1b2-c3d4e5f60718',
  nom: 'OF-2026-000041',
  etat: 'CLOTURE',
  type: 'ORDRE_DE_FABRICATION',
} satisfies RestSuiviDAtelierEnGrille;

const UN_SUIVI_DETAILLE = { ...UN_ELEMENT_QUE_JEAN_TRAVAILLE, journal: [] } satisfies RestSuiviDAtelier;

const unAtelierFixture = (nombre: number): RestSuiviDAtelierEnGrille[] =>
  Array.from({ length: nombre }, (_, rang) => ({ ...UN_ELEMENT_QUE_PERSONNE_N_A_COMMENCE, id: `suivi-${rang}` }));

const SUIVI_ID = UN_ELEMENT_QUE_JEAN_TRAVAILLE.id;
const URL_DES_POINTAGES = `/api/atelier/suivis/${SUIVI_ID}/pointages`;
const UN_DEBUT_DE_JEAN: Pointage = { ...identiteFixture, operateurId: JEAN, type: 'DEBUT', posteId: TOUR_1.id };
const UN_DEBUT_SANS_MACHINE: Pointage = { ...identiteFixture, operateurId: JEAN, type: 'DEBUT' };
const DEUX_DEBUTS_DE_SUITE = 'un DEBUT suppose une activite fermee';
const UN_ELEMENT_QUI_A_QUITTE_L_ATELIER = "aucun suivi d'atelier ne porte cet identifiant";

type TourDuServeur = (requete: TestRequest) => void;

const acceptant: TourDuServeur = requete => requete.flush({}, { status: 201, statusText: 'Created' });

const refusant =
  (statut: number, code: string, message: string): TourDuServeur =>
  requete =>
    requete.flush(
      { type: `urn:glm:erreur:atelier:${code}`, title: code.replaceAll('-', ' '), status: statut, message },
      { status: statut, statusText: 'Refused' },
    );

const enPanne: TourDuServeur = requete => requete.flush(null, { status: 500, statusText: 'Internal Server Error' });

const refusantLeCorps: TourDuServeur = requete =>
  requete.flush(
    { title: 'Bean validation error', status: 400, errors: { operateur: 'ne doit pas être nul' } },
    { status: 400, statusText: 'Bad Request' },
  );

const adapters: [string, () => SuivisDAtelierPort][] = [['http', () => TestBed.inject(HttpSuivisDAtelier)]];

describe.each(adapters)('SuivisDAtelierPort contract, honoured by %s', (_adapter, buildSuivis) => {
  let suivis: SuivisDAtelierPort;
  let serveur: HttpTestingController;
  let atelierFixture: RestSuiviDAtelierEnGrille[];
  let toursDuServeur: TourDuServeur[];

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), ApiClient, HttpSuivisDAtelier] });
    suivis = buildSuivis();
    serveur = TestBed.inject(HttpTestingController);
    atelierFixture = [];
    toursDuServeur = [];
  });

  afterEach(() => {
    serveur.verify();
  });

  it('should hand over the elements the workshop has been given to make', async () => {
    givenTheWorkshopHolds([UN_ELEMENT_QUE_PERSONNE_N_A_COMMENCE]);

    const lecture = await whenReadingTheWorkshop();

    thenItReadTheWaitingElement(lecture);
  });

  it('should leave out the elements the workshop has closed', async () => {
    givenTheWorkshopHolds([UN_ELEMENT_CLOTURE, UN_ELEMENT_QUE_PERSONNE_N_A_COMMENCE]);

    const lecture = await whenReadingTheWorkshop();

    thenItReadOnly(lecture, ['OF-2026-000042']);
  });

  it('should hand over the activity of the operator it is asked about, and none of the others', async () => {
    givenTheWorkshopHolds([UN_ELEMENT_QUE_JEAN_TRAVAILLE]);

    const lecture = await whenReadingTheWorkshop();

    thenJeanIsAtWorkOnTour1(lecture);
  });

  it('should hand over the time the operator has spent on the element', async () => {
    givenTheWorkshopHolds([UN_ELEMENT_QUE_JEAN_TRAVAILLE]);

    const lecture = await whenReadingTheWorkshop();

    thenJeanHasBeenOnItFor(lecture, UNE_HEURE_ET_DEMIE);
  });

  it('should read an activity opened on no workstation, as a company without a machine park does', async () => {
    givenTheWorkshopHolds([UN_ELEMENT_TRAVAILLE_SANS_MACHINE]);

    const lecture = await whenReadingTheWorkshop();

    thenJeanIsAtWorkOnNoWorkstation(lecture);
  });

  it('should hand over no activity on an element nobody has started', async () => {
    givenTheWorkshopHolds([UN_ELEMENT_QUE_PERSONNE_N_A_COMMENCE]);

    const lecture = await whenReadingTheWorkshop();

    thenNobodyIsOnIt(lecture);
  });

  it('should read past the page the server sends when it is asked for nothing', async () => {
    givenTheWorkshopHolds(unAtelierFixture(TOUT_UN_ATELIER));

    const lecture = await whenReadingTheWorkshop();

    thenItReadAWholeWorkshopOf(lecture, TOUT_UN_ATELIER);
  });

  it('should say the extract is partial rather than drop the oldest elements in silence', async () => {
    givenTheWorkshopHolds(unAtelierFixture(PLUS_QUE_LE_SERVEUR_N_EN_REND));

    const lecture = await whenReadingTheWorkshop();

    thenItSaysItMissesSome(lecture, PLUS_QUE_LE_SERVEUR_N_EN_REND);
  });

  it('should record the operator starting to work on the element', async () => {
    givenTheServerAcceptsTheClocking();

    const result = await whenRecording(UN_DEBUT_DE_JEAN);

    thenItWasRecorded(result, { operateur: JEAN, type: 'DEBUT', poste: TOUR_1.id });
  });

  it('should clock on no workstation in a company that has no machine park', async () => {
    givenTheServerAcceptsTheClocking();

    const result = await whenRecording(UN_DEBUT_SANS_MACHINE);

    thenItWasRecorded(result, { operateur: JEAN, type: 'DEBUT' });
  });

  it('should refuse a clocking the element cannot take, with the message the domain wrote', async () => {
    givenTheServerRefusesTheClocking('transition-d-atelier-interdite', DEUX_DEBUTS_DE_SUITE);

    const result = await whenRecording(UN_DEBUT_DE_JEAN);

    thenItWasRefused(result.issue, 'transition-d-atelier-interdite', DEUX_DEBUTS_DE_SUITE);
  });

  it('should refuse a clocking on an element the workshop no longer holds', async () => {
    givenTheServerRefusesTheClocking('suivi-d-atelier-introuvable', UN_ELEMENT_QUI_A_QUITTE_L_ATELIER, 404);

    const result = await whenRecording(UN_DEBUT_DE_JEAN);

    thenItWasRefused(result.issue, 'suivi-d-atelier-introuvable', UN_ELEMENT_QUI_A_QUITTE_L_ATELIER);
  });

  it('should replay a clocking another entry slipped in front of, and record it', async () => {
    givenARaceThenAcceptance();

    const result = await whenRecording(UN_DEBUT_DE_JEAN);

    thenItWasRecorded(result, { operateur: JEAN, type: 'DEBUT', poste: TOUR_1.id });
  });

  it('should refuse the clocking when the replay meets the same race', async () => {
    givenTwoConsecutiveRaces();

    const result = await whenRecording(UN_DEBUT_DE_JEAN);

    thenItWasRefused(result.issue, 'saisie-concurrente', 'une autre saisie est passee avant');
  });

  it('should let a server breakdown through, since no business refused anything', async () => {
    givenTheServerBreaksDown();

    const result = await whenRecording(UN_DEBUT_DE_JEAN);

    thenItFailedWithoutRefusing(result.issue);
  });

  it('should let an invalid body through as a failure, since at the pupitre it comes from us', async () => {
    givenTheServerRefusesTheBody();

    const result = await whenRecording(UN_DEBUT_DE_JEAN);

    thenItFailedWithoutRefusing(result.issue);
  });

  it('should let a code none of its ports reaches through as a failure', async () => {
    givenTheServerRefusesTheClocking('element-deja-engage', 'cet element est deja engage');

    const result = await whenRecording(UN_DEBUT_DE_JEAN);

    thenItFailedWithoutRefusing(result.issue);
  });

  const unTourDeBoucle = (): Promise<void> => new Promise(resolve => setTimeout(resolve));

  const echecDe = (envoi: Promise<void>): Promise<unknown> =>
    envoi.then(
      () => undefined,
      (echec: unknown) => echec,
    );

  const givenTheWorkshopHolds = (atelier: RestSuiviDAtelierEnGrille[]): void => {
    atelierFixture = atelier;
  };
  const givenTheServerAcceptsTheClocking = (): void => {
    toursDuServeur = [acceptant];
  };
  const givenTheServerRefusesTheClocking = (code: string, message: string, status = 409): void => {
    toursDuServeur = [refusant(status, code, message)];
  };
  const givenARaceThenAcceptance = (): void => {
    toursDuServeur = [refusant(409, 'saisie-concurrente', 'une autre saisie est passee avant'), acceptant];
  };
  const givenTwoConsecutiveRaces = (): void => {
    toursDuServeur = [
      refusant(409, 'saisie-concurrente', 'une autre saisie est passee avant'),
      refusant(409, 'saisie-concurrente', 'une autre saisie est passee avant'),
    ];
  };
  const givenTheServerBreaksDown = (): void => {
    toursDuServeur = [enPanne];
  };
  const givenTheServerRefusesTheBody = (): void => {
    toursDuServeur = [refusantLeCorps];
  };
  const whenReadingTheWorkshop = async (): Promise<Page<SuiviDAtelier>> => {
    const lecture = suivis.suivis(ETATS_EN_ATELIER);
    await whenServerReturnsTheWorkshop();
    return lecture;
  };
  const whenRecording = async (pointage: Pointage): Promise<{ issue: unknown; requests: TestRequest[] }> => {
    const envoi = echecDe(suivis.recordPointage(SUIVI_ID, pointage));
    const requests: TestRequest[] = [];

    for (const [index, tour] of toursDuServeur.entries()) {
      await unTourDeBoucle();
      const request = serveur.expectOne(URL_DES_POINTAGES);
      requests.push(request);
      tour(request);
      if (index < toursDuServeur.length - 1) {
        await unTourDeBoucle();
        serveur.expectOne(`/api/atelier/suivis/${SUIVI_ID}`).flush(UN_SUIVI_DETAILLE);
      }
    }

    return { issue: await envoi, requests };
  };

  const thenItWasRecorded = (result: { issue: unknown; requests: TestRequest[] }, body: unknown): void => {
    expect(result.issue).toBeUndefined();
    expect(result.requests.at(-1)?.request.body).toEqual({ ...(body as object), ...identiteFixture });
  };

  const thenItWasRefused = (echec: unknown, code: string, message: string): void => {
    expect(echec).toBeInstanceOf(RefusDAtelier);
    expect((echec as RefusDAtelier).code).toBe(code);
    expect((echec as RefusDAtelier).message).toBe(message);
  };

  const thenItFailedWithoutRefusing = (echec: unknown): void => {
    expect(echec).toBeDefined();
    expect(echec).not.toBeInstanceOf(RefusDAtelier);
  };

  const whenServerReturnsTheWorkshop = async (): Promise<void> => {
    await unTourDeBoucle();

    const requete = serveur.expectOne(demande => demande.url === '/api/atelier/suivis');
    const etats = requete.request.params.getAll('etats') ?? [];
    const demandee = Number(requete.request.params.get('size') ?? PAGE_PAR_DEFAUT_DU_SERVEUR);
    const engages = atelierFixture.filter(suivi => etats.includes(suivi.etat));

    if (demandee > PAGE_MAXIMALE_DU_SERVEUR) {
      requete.flush(null, { status: 500, statusText: 'la taille de page demandée dépasse le plafond du serveur' });
      return;
    }

    requete.flush({
      content: engages.slice(0, demandee),
      currentPage: 0,
      pageSize: demandee,
      totalElementsCount: engages.length,
    });
  };

  const thenItReadTheWaitingElement = (extrait: Page<SuiviDAtelier>): void => {
    const [suivi] = extrait.elements;

    expect(suivi.id).toBe(UN_ELEMENT_QUE_PERSONNE_N_A_COMMENCE.id);
    expect(suivi.numero()).toBe('OF-2026-000042');
    expect(suivi.etat).toBe('EN_ATTENTE');
    expect(suivi.type).toBe('ORDRE_DE_FABRICATION');
  };

  const thenItReadOnly = (extrait: Page<SuiviDAtelier>, numeros: string[]): void => {
    expect(extrait.elements.map(suivi => suivi.numero())).toEqual(numeros);
  };

  const thenJeanIsAtWorkOnTour1 = (extrait: Page<SuiviDAtelier>): void => {
    const activite = extrait.elements[0].findActiviteFor(JEAN);

    expect(activite?.categorie).toBe('TRAVAIL');
    expect(activite?.posteId).toBe(TOUR_1.id);
  };

  const thenJeanHasBeenOnItFor = (extrait: Page<SuiviDAtelier>, millisecondes: number): void => {
    expect(extrait.elements[0].computeDureeFor(JEAN, NEUF_HEURES_TRENTE)).toBe(millisecondes);
  };

  const thenJeanIsAtWorkOnNoWorkstation = (extrait: Page<SuiviDAtelier>): void => {
    expect(extrait.elements[0].findActiviteFor(JEAN)?.posteId).toBeUndefined();
  };

  const thenNobodyIsOnIt = (extrait: Page<SuiviDAtelier>): void => {
    expect(extrait.elements[0].findActiviteFor(JEAN)).toBeUndefined();
    expect(extrait.elements[0].computeDureeFor(JEAN, NEUF_HEURES_TRENTE)).toBeUndefined();
  };

  const thenItReadAWholeWorkshopOf = (extrait: Page<SuiviDAtelier>, nombre: number): void => {
    expect(extrait.elements).toHaveLength(nombre);
    expect(extrait.isComplete()).toBe(true);
  };

  const thenItSaysItMissesSome = (extrait: Page<SuiviDAtelier>, totalCount: number): void => {
    expect(extrait.totalCount).toBe(totalCount);
    expect(extrait.isComplete()).toBe(false);
  };
});
