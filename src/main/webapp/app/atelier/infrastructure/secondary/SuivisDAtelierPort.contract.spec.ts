import { components } from '@/app/api/schema';
import { ETATS_EN_ATELIER } from '@/app/atelier/domain/EtatDAtelier';
import { SuiviDAtelier } from '@/app/atelier/domain/SuiviDAtelier';
import { SuivisDAtelierPort } from '@/app/atelier/domain/SuivisDAtelierPort';
import { ClientApi } from '@/app/shared/api-client/infrastructure/secondary/ClientApi';
import { Extrait } from '@/app/shared/pagination/domain/Extrait';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HttpSuivisDAtelier } from './http/HttpSuivisDAtelier';

type RestSuiviDAtelier = components['schemas']['RestSuiviDAtelier'];

const PAGE_PAR_DEFAUT_DU_SERVEUR = 20;
const PAGE_MAXIMALE_DU_SERVEUR = 100;
const TOUT_UN_ATELIER = 60;
const PLUS_QUE_LE_SERVEUR_N_EN_REND = 137;
const JEAN = '0a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d';
const MARIE = '9f8e7d6c-5b4a-3210-9876-543210fedcba';
const HUIT_HEURES = '2026-05-11T06:00:00Z';
const NEUF_HEURES_TRENTE = new Date('2026-05-11T07:30:00Z');
const UNE_HEURE_ET_DEMIE = 90 * 60 * 1000;

const TOUR_1 = { id: '11111111-2222-3333-4444-555555555555', libelle: 'Tour 1', nature: 'tournage' };
const JEAN_DUPONT = { id: JEAN, nom: 'Dupont', prenom: 'Jean' };
const MARIE_MARTIN = { id: MARIE, nom: 'Martin', prenom: 'Marie' };

const UN_ELEMENT_QUE_PERSONNE_N_A_COMMENCE = {
  id: 'b7f0c2de-1f2a-4c3b-9d4e-5f6a7b8c9d0e',
  nom: 'OF-2026-000042',
  etat: 'EN_ATTENTE',
  type: 'ORDRE_DE_FABRICATION',
} satisfies RestSuiviDAtelier;

const UN_ELEMENT_QUE_JEAN_TRAVAILLE = {
  id: 'c8e1d3ef-2a3b-4d5c-8e9f-0a1b2c3d4e5f',
  nom: 'OF-2026-000043',
  etat: 'EN_COURS',
  type: 'PRODUIT',
  activitesEnCours: [
    { operateur: MARIE_MARTIN, categorie: 'NON_CONFORMITE', depuis: HUIT_HEURES, poste: TOUR_1 },
    { operateur: JEAN_DUPONT, categorie: 'TRAVAIL', depuis: HUIT_HEURES, poste: TOUR_1 },
  ],
} satisfies RestSuiviDAtelier;

const UN_ELEMENT_TRAVAILLE_SANS_MACHINE = {
  id: 'd9f2e4a0-3b4c-5e6d-9f0a-1b2c3d4e5f60',
  nom: 'OF-2026-000044',
  etat: 'EN_COURS',
  type: 'ORDRE_DE_FABRICATION',
  activitesEnCours: [{ operateur: JEAN_DUPONT, categorie: 'TRAVAIL', depuis: HUIT_HEURES }],
} satisfies RestSuiviDAtelier;

const UN_ELEMENT_CLOTURE = {
  id: 'e0a3f5b1-4c5d-6f70-a1b2-c3d4e5f60718',
  nom: 'OF-2026-000041',
  etat: 'CLOTURE',
  type: 'ORDRE_DE_FABRICATION',
} satisfies RestSuiviDAtelier;

const UN_ELEMENT_SANS_IDENTIFIANT = { nom: 'OF-2026-000045', etat: 'EN_ATTENTE', type: 'PRODUIT' } satisfies RestSuiviDAtelier;

const unAtelierFixture = (nombre: number): RestSuiviDAtelier[] =>
  Array.from({ length: nombre }, (_, rang) => ({ ...UN_ELEMENT_QUE_PERSONNE_N_A_COMMENCE, id: `suivi-${rang}` }));

const adapters: [string, () => SuivisDAtelierPort][] = [['http', () => TestBed.inject(HttpSuivisDAtelier)]];

describe.each(adapters)('SuivisDAtelierPort contract, honoured by %s', (_adapter, buildSuivis) => {
  let suivis: SuivisDAtelierPort;
  let serveur: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), ClientApi, HttpSuivisDAtelier] });
    suivis = buildSuivis();
    serveur = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    serveur.verify();
  });

  it('should hand over the elements the workshop has been given to make', async () => {
    const lecture = suivis.suivis(ETATS_EN_ATELIER);

    await whenTheWorkshopHolds([UN_ELEMENT_QUE_PERSONNE_N_A_COMMENCE]);

    thenItReadTheWaitingElement(await lecture);
  });

  it('should leave out the elements the workshop has closed', async () => {
    const lecture = suivis.suivis(ETATS_EN_ATELIER);

    await whenTheWorkshopHolds([UN_ELEMENT_CLOTURE, UN_ELEMENT_QUE_PERSONNE_N_A_COMMENCE]);

    thenItReadOnly(await lecture, ['OF-2026-000042']);
  });

  it('should hand over the activity of the operator it is asked about, and none of the others', async () => {
    const lecture = suivis.suivis(ETATS_EN_ATELIER);

    await whenTheWorkshopHolds([UN_ELEMENT_QUE_JEAN_TRAVAILLE]);

    thenJeanIsAtWorkOnTour1(await lecture);
  });

  it('should hand over the time the operator has spent on the element', async () => {
    const lecture = suivis.suivis(ETATS_EN_ATELIER);

    await whenTheWorkshopHolds([UN_ELEMENT_QUE_JEAN_TRAVAILLE]);

    thenJeanHasBeenOnItFor(await lecture, UNE_HEURE_ET_DEMIE);
  });

  it('should read an activity opened on no workstation, as a company without a machine park does', async () => {
    const lecture = suivis.suivis(ETATS_EN_ATELIER);

    await whenTheWorkshopHolds([UN_ELEMENT_TRAVAILLE_SANS_MACHINE]);

    thenJeanIsAtWorkOnNoWorkstation(await lecture);
  });

  it('should hand over no activity on an element nobody has started', async () => {
    const lecture = suivis.suivis(ETATS_EN_ATELIER);

    await whenTheWorkshopHolds([UN_ELEMENT_QUE_PERSONNE_N_A_COMMENCE]);

    thenNobodyIsOnIt(await lecture);
  });

  it('should read past the page the server sends when it is asked for nothing', async () => {
    const lecture = suivis.suivis(ETATS_EN_ATELIER);

    await whenTheWorkshopHolds(unAtelierFixture(TOUT_UN_ATELIER));

    thenItReadAWholeWorkshopOf(await lecture, TOUT_UN_ATELIER);
  });

  it('should say the extract is partial rather than drop the oldest elements in silence', async () => {
    const lecture = suivis.suivis(ETATS_EN_ATELIER);

    await whenTheWorkshopHolds(unAtelierFixture(PLUS_QUE_LE_SERVEUR_N_EN_REND));

    thenItSaysItMissesSome(await lecture, PLUS_QUE_LE_SERVEUR_N_EN_REND);
  });

  it('should refuse an element the server sent without the identifier its URLs carry', async () => {
    const lecture = suivis.suivis(ETATS_EN_ATELIER);

    await whenTheWorkshopHolds([UN_ELEMENT_SANS_IDENTIFIANT]);

    await expect(lecture).rejects.toThrow('suivi.id');
  });

  const unTourDeBoucle = (): Promise<void> => new Promise(resolve => setTimeout(resolve));

  const whenTheWorkshopHolds = async (atelier: RestSuiviDAtelier[]): Promise<void> => {
    await unTourDeBoucle();

    const requete = serveur.expectOne(demande => demande.url === '/api/atelier/suivis');
    const etats = requete.request.params.getAll('etats') ?? [];
    const demandee = Number(requete.request.params.get('size') ?? PAGE_PAR_DEFAUT_DU_SERVEUR);
    const engages = atelier.filter(suivi => etats.includes(suivi.etat ?? ''));

    if (demandee > PAGE_MAXIMALE_DU_SERVEUR) {
      requete.flush(null, { status: 500, statusText: 'la taille de page demandée dépasse le plafond du serveur' });
      return;
    }

    requete.flush({ content: engages.slice(0, demandee), totalElementsCount: engages.length });
  };

  const thenItReadTheWaitingElement = (extrait: Extrait<SuiviDAtelier>): void => {
    const [suivi] = extrait.elements;

    expect(suivi.id).toBe(UN_ELEMENT_QUE_PERSONNE_N_A_COMMENCE.id);
    expect(suivi.numero()).toBe('OF-2026-000042');
    expect(suivi.etat).toBe('EN_ATTENTE');
    expect(suivi.type).toBe('ORDRE_DE_FABRICATION');
  };

  const thenItReadOnly = (extrait: Extrait<SuiviDAtelier>, numeros: string[]): void => {
    expect(extrait.elements.map(suivi => suivi.numero())).toEqual(numeros);
  };

  const thenJeanIsAtWorkOnTour1 = (extrait: Extrait<SuiviDAtelier>): void => {
    const activite = extrait.elements[0].activiteDe(JEAN);

    expect(activite?.categorie).toBe('TRAVAIL');
    expect(activite?.posteId).toBe(TOUR_1.id);
  };

  const thenJeanHasBeenOnItFor = (extrait: Extrait<SuiviDAtelier>, millisecondes: number): void => {
    expect(extrait.elements[0].dureeDe(JEAN, NEUF_HEURES_TRENTE)).toBe(millisecondes);
  };

  const thenJeanIsAtWorkOnNoWorkstation = (extrait: Extrait<SuiviDAtelier>): void => {
    expect(extrait.elements[0].activiteDe(JEAN)?.posteId).toBeUndefined();
  };

  const thenNobodyIsOnIt = (extrait: Extrait<SuiviDAtelier>): void => {
    expect(extrait.elements[0].activiteDe(JEAN)).toBeUndefined();
    expect(extrait.elements[0].dureeDe(JEAN, NEUF_HEURES_TRENTE)).toBeUndefined();
  };

  const thenItReadAWholeWorkshopOf = (extrait: Extrait<SuiviDAtelier>, nombre: number): void => {
    expect(extrait.elements).toHaveLength(nombre);
    expect(extrait.estComplet()).toBe(true);
  };

  const thenItSaysItMissesSome = (extrait: Extrait<SuiviDAtelier>, nombreTotal: number): void => {
    expect(extrait.nombreTotal).toBe(nombreTotal);
    expect(extrait.estComplet()).toBe(false);
  };
});
