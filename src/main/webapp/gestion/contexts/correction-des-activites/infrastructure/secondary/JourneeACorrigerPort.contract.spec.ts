import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { ActiviteDeLaJournee } from '../../domain/journee/ActiviteDeLaJournee';
import { ActiviteDeLaJourneeId } from '../../domain/journee/ActiviteDeLaJourneeId';
import { BornesDuJour } from '../../domain/journee/BornesDuJour';
import { CategorieDElement } from '../../domain/journee/CategorieDElement';
import { ChoixDAjout } from '../../domain/journee/ChoixDAjout';
import { Duree } from '../../domain/journee/Duree';
import { ElementDeLaJournee } from '../../domain/journee/ElementDeLaJournee';
import { ElementDeLaJourneeId } from '../../domain/journee/ElementDeLaJourneeId';
import { InstantDeLaJournee } from '../../domain/journee/InstantDeLaJournee';
import { JourACorriger } from '../../domain/journee/JourACorriger';
import { JourneeACorriger } from '../../domain/journee/JourneeACorriger';
import { JourneeACorrigerPort } from '../../domain/journee/JourneeACorrigerPort';
import { OperateurDeLaJournee } from '../../domain/journee/OperateurDeLaJournee';
import { OperateurDeLaJourneeId } from '../../domain/journee/OperateurDeLaJourneeId';
import { PortionDeJour } from '../../domain/journee/PortionDeJour';
import { PosteDeLaJournee } from '../../domain/journee/PosteDeLaJournee';
import { PosteDeLaJourneeId } from '../../domain/journee/PosteDeLaJourneeId';
import { SuiviDAtelierId } from '../../domain/journee/SuiviDAtelierId';
import { SuiviPresent } from '../../domain/journee/SuiviPresent';
import { SuivisPresents } from '../../domain/journee/SuivisPresents';
import { HttpJourneeACorriger } from './HttpJourneeACorriger';

type RestJournee = components['schemas']['RestJourneeACorriger'];
type RestElement = components['schemas']['RestElementDeLaJournee'];
type RestPoste = components['schemas']['RestPosteDeLaJournee'];
type RestActivite = components['schemas']['RestActiviteDeLaJournee'];

const OPERATEUR = new OperateurDeLaJourneeId('op-1');
const JOUR = new JourACorriger('2026-10-05');
const URL_DE_LA_JOURNEE = '/api/atelier/operateurs/op-1/journees/2026-10-05';

const restElement = (suffixe: string): RestElement => ({
  id: `element-${suffixe}`,
  categorie: 'OF',
  nom: `PRD-2026-0000${suffixe}`,
  reference: `24-13${suffixe}`,
  description: `Carter ${suffixe}`,
});

const restTour: RestPoste = { id: 'poste-tour', libelle: 'Tour CN 1', nature: 'Tournage' };
const restFraiseuse: RestPoste = { id: 'poste-fraise', libelle: 'DMU 50', nature: 'Fraisage' };

const restJourneeFixture = (): RestJournee => ({
  operateur: { id: 'op-1', nom: 'Dupont', prenom: 'Jean' },
  jour: '2026-10-05',
  evaluation: '2026-10-05T20:00:00Z',
  bornes: { debut: '2026-10-04T22:00:00Z', fin: '2026-10-05T22:00:00Z', finDuLendemain: '2026-10-06T22:00:00Z' },
  dureeOperationnelle: 'PT7H30M',
  activites: [
    {
      id: 'debut-1',
      suivi: 'suivi-1',
      element: restElement('1'),
      poste: restTour,
      categorie: 'TRAVAIL',
      debut: '2026-10-05T07:00:00Z',
      fin: '2026-10-05T11:00:00Z',
      etat: 'TERMINEE',
      dureeSurLeJour: 'PT4H',
      autresJours: [],
    },
    {
      id: 'debut-2',
      suivi: 'suivi-1',
      element: restElement('1'),
      poste: restFraiseuse,
      categorie: 'NON_CONFORMITE',
      debut: '2026-10-05T20:00:00Z',
      fin: '2026-10-06T01:30:00Z',
      etat: 'TERMINEE_AUTOMATIQUEMENT',
      dureeSurLeJour: 'PT2H',
      autresJours: [{ jour: '2026-10-06', duree: 'PT3H30M' }],
    },
    {
      id: 'debut-3',
      suivi: 'suivi-2',
      element: restElement('2'),
      categorie: 'TRAVAIL',
      debut: '2026-10-05T12:00:00Z',
      fin: '2026-10-05T13:30:00Z',
      etat: 'TERMINEE',
      dureeSurLeJour: 'PT1H30M',
      autresJours: [],
    },
    {
      id: 'debut-4',
      suivi: 'suivi-1',
      element: restElement('1'),
      categorie: 'TRAVAIL',
      debut: '2026-10-05T14:00:00Z',
      etat: 'EN_COURS',
      autresJours: [],
    },
  ],
  choix: {
    suivis: [
      { suivi: 'suivi-1', element: restElement('1'), engageLe: '2026-10-03T06:00:00Z' },
      { suivi: 'suivi-2', element: restElement('2'), engageLe: '2026-10-04T06:00:00Z', clotureLe: '2026-10-05T09:00:00Z' },
    ],
    postes: [restFraiseuse, restTour],
  },
});

type Corruption = (journee: RestJournee) => RestJournee;

const sans =
  (champ: keyof RestActivite) =>
  (activite: RestActivite): RestActivite =>
    Object.fromEntries(Object.entries(activite).filter(([nom]) => nom !== champ)) as RestActivite;

const surLaPremiereActivite =
  (changement: Partial<RestActivite> | ((activite: RestActivite) => RestActivite)): Corruption =>
  journee => ({
    ...journee,
    activites: journee.activites.map((activite, rang) => {
      if (rang > 0) return activite;
      return typeof changement === 'function' ? changement(activite) : { ...activite, ...changement };
    }),
  });

const instant = (recu: string): InstantDeLaJournee => new InstantDeLaJournee(recu);

const elementDomaine = (suffixe: string): ElementDeLaJournee =>
  new ElementDeLaJournee({
    id: new ElementDeLaJourneeId(`element-${suffixe}`),
    categorie: new CategorieDElement('OF'),
    nom: `PRD-2026-0000${suffixe}`,
    reference: `24-13${suffixe}`,
    description: `Carter ${suffixe}`,
  });

const tourDomaine = new PosteDeLaJournee(new PosteDeLaJourneeId('poste-tour'), 'Tour CN 1', 'Tournage');
const fraiseuseDomaine = new PosteDeLaJournee(new PosteDeLaJourneeId('poste-fraise'), 'DMU 50', 'Fraisage');

const suivisDomaine = new SuivisPresents([
  new SuiviPresent({
    suivi: new SuiviDAtelierId('suivi-1'),
    element: elementDomaine('1'),
    engageLe: instant('2026-10-03T08:00:00+02:00'),
    clotureLe: undefined,
  }),
  new SuiviPresent({
    suivi: new SuiviDAtelierId('suivi-2'),
    element: elementDomaine('2'),
    engageLe: instant('2026-10-04T08:00:00+02:00'),
    clotureLe: instant('2026-10-05T11:00:00+02:00'),
  }),
]);

const journeeDomaine = (): JourneeACorriger =>
  new JourneeACorriger({
    operateur: new OperateurDeLaJournee(OPERATEUR, 'Dupont', 'Jean'),
    jour: JOUR,
    bornes: new BornesDuJour({
      debut: instant('2026-10-05T00:00:00+02:00'),
      fin: instant('2026-10-06T00:00:00+02:00'),
      finDuLendemain: instant('2026-10-07T00:00:00+02:00'),
    }),
    dureeOperationnelle: new Duree('PT7H30M'),
    activites: [
      new ActiviteDeLaJournee({
        id: new ActiviteDeLaJourneeId('debut-1'),
        suivi: new SuiviDAtelierId('suivi-1'),
        element: elementDomaine('1'),
        poste: tourDomaine,
        categorie: 'TRAVAIL',
        debut: instant('2026-10-05T09:00:00+02:00'),
        etat: { kind: 'TERMINEE', fin: instant('2026-10-05T13:00:00+02:00'), dureeSurLeJour: new Duree('PT4H') },
        autresJours: [],
      }),
      new ActiviteDeLaJournee({
        id: new ActiviteDeLaJourneeId('debut-2'),
        suivi: new SuiviDAtelierId('suivi-1'),
        element: elementDomaine('1'),
        poste: fraiseuseDomaine,
        categorie: 'NON_CONFORMITE',
        debut: instant('2026-10-05T22:00:00+02:00'),
        etat: { kind: 'TERMINEE_AUTOMATIQUEMENT', fin: instant('2026-10-06T03:30:00+02:00'), dureeSurLeJour: new Duree('PT2H') },
        autresJours: [new PortionDeJour(new JourACorriger('2026-10-06'), new Duree('PT3H30M'))],
      }),
      new ActiviteDeLaJournee({
        id: new ActiviteDeLaJourneeId('debut-3'),
        suivi: new SuiviDAtelierId('suivi-2'),
        element: elementDomaine('2'),
        poste: undefined,
        categorie: 'TRAVAIL',
        debut: instant('2026-10-05T14:00:00+02:00'),
        etat: { kind: 'TERMINEE', fin: instant('2026-10-05T15:30:00+02:00'), dureeSurLeJour: new Duree('PT1H30M') },
        autresJours: [],
      }),
      new ActiviteDeLaJournee({
        id: new ActiviteDeLaJourneeId('debut-4'),
        suivi: new SuiviDAtelierId('suivi-1'),
        element: elementDomaine('1'),
        poste: undefined,
        categorie: 'TRAVAIL',
        debut: instant('2026-10-05T16:00:00+02:00'),
        etat: { kind: 'EN_COURS' },
        autresJours: [],
      }),
    ],
    choix: new ChoixDAjout({ suivis: suivisDomaine, postes: [fraiseuseDomaine, tourDomaine] }),
  });

describe('Beyond the contract: HTTP reading of the day to correct', () => {
  let port: JourneeACorrigerPort;
  let server: HttpTestingController;
  let errors: ErrorHandlerFixture;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ApiClient,
        { provide: ErrorHandlerPort, useClass: ErrorHandlerFixture },
        { provide: JourneeACorrigerPort, useClass: HttpJourneeACorriger },
      ],
    });
    port = TestBed.inject(JourneeACorrigerPort);
    server = TestBed.inject(HttpTestingController);
    errors = TestBed.inject(ErrorHandlerPort) as ErrorHandlerFixture;
  });

  afterEach(() => {
    server.verify();
  });

  it('should read the day of the operator on the dedicated endpoint, without choosing the evaluation', async () => {
    const lecture = await whenReadingAnsweredWith(restJourneeFixture());

    thenTheReadWas(lecture.requete, URL_DE_LA_JOURNEE);
  });

  it('should rebuild the day received: bornes, activities, durations and choices of an addition', async () => {
    const lecture = await whenReadingAnsweredWith(restJourneeFixture());

    expect(lecture.journee).toEqual(journeeDomaine());
    expect(errors.errors).toEqual([]);
  });

  it('should resolve an unknown operator as a known absence and report nothing', async () => {
    const lecture = await whenReadingRefusedWith(404, { type: 'urn:glm:erreur:atelier:operateur-introuvable' });

    expect(lecture).toBeUndefined();
    expect(errors.errors).toEqual([]);
  });

  it.each([
    { cas: 'another business code', status: 404, corps: { type: 'urn:glm:erreur:atelier:suivi-d-atelier-introuvable' } },
    { cas: 'a malformed day or evaluation', status: 400, corps: {} },
    { cas: 'a server failure', status: 500, corps: {} },
  ])('should reject and report once $cas instead of taking it for an absence', async ({ status, corps }) => {
    const rejet = await whenReadingRejectedWith(status, corps);

    expect(rejet).toBeInstanceOf(HttpErrorResponse);
    expect(errors.errors).toEqual([rejet]);
  });

  it.each([
    { cas: 'an instant without an offset', corrompre: surLaPremiereActivite({ debut: '2026-10-05T09:00:00' }) },
    { cas: 'a finished activity without an end', corrompre: surLaPremiereActivite(sans('fin')) },
    { cas: 'a finished activity without a duration on the day', corrompre: surLaPremiereActivite(sans('dureeSurLeJour')) },
    { cas: 'an activity ending before it starts', corrompre: surLaPremiereActivite({ fin: '2026-10-05T06:59:00Z' }) },
    { cas: 'an activity of a suivi that is not present', corrompre: surLaPremiereActivite({ suivi: 'suivi-9' }) },
    { cas: 'an activity whose element is not the one of its suivi', corrompre: surLaPremiereActivite({ element: restElement('2') }) },
    { cas: 'a malformed duration', corrompre: (journee: RestJournee): RestJournee => ({ ...journee, dureeOperationnelle: '7h30' }) },
    { cas: 'a day that does not exist', corrompre: (journee: RestJournee): RestJournee => ({ ...journee, jour: '2026-02-30' }) },
    {
      cas: 'bornes that do not follow each other',
      corrompre: (journee: RestJournee): RestJournee => ({ ...journee, bornes: { ...journee.bornes, fin: journee.bornes.debut } }),
    },
    {
      cas: 'an end of the next day that does not follow the end of the day',
      corrompre: (journee: RestJournee): RestJournee => ({ ...journee, bornes: { ...journee.bornes, finDuLendemain: journee.bornes.fin } }),
    },
  ])('should reject and report once $cas instead of showing a doubtful day', async ({ corrompre }) => {
    const rejet = await whenReadingRejectedWith(200, corrompre(restJourneeFixture()));

    expect(rejet).toBeInstanceOf(Error);
    expect(errors.errors).toEqual([rejet]);
  });

  interface LectureDeLaJournee {
    readonly requete: TestRequest;
    readonly journee: JourneeACorriger | undefined;
  }

  const whenReadingAnsweredWith = async (corps: object): Promise<LectureDeLaJournee> => {
    const journee = port.lire(OPERATEUR, JOUR);
    const requete = server.expectOne(URL_DE_LA_JOURNEE);
    requete.flush(corps);
    return { requete, journee: await journee };
  };

  const whenReadingRefusedWith = async (status: number, corps: object): Promise<JourneeACorriger | undefined> => {
    const journee = port.lire(OPERATEUR, JOUR);
    server.expectOne(URL_DE_LA_JOURNEE).flush(corps, { status, statusText: 'Refused' });
    return journee;
  };

  const whenReadingRejectedWith = async (status: number, corps: object): Promise<unknown> => {
    const rejet = port.lire(OPERATEUR, JOUR).catch((failure: unknown) => failure);
    server.expectOne(URL_DE_LA_JOURNEE).flush(corps, { status, statusText: 'Failed' });
    return rejet;
  };

  const thenTheReadWas = (requete: TestRequest, url: string): void => {
    expect(requete.request.method).toBe('GET');
    expect(requete.request.urlWithParams).toBe(url);
  };
});
