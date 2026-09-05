import { components } from '@/app/generated/schema';
import { Operateur } from '@/app/operateur/domain/Operateur';
import { OperateursPort } from '@/app/operateur/domain/OperateursPort';
import { ClientApi } from '@/app/shared/api-client/infrastructure/secondary/ClientApi';
import { Extrait } from '@/app/shared/pagination/domain/Extrait';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HttpOperateurs } from './http/HttpOperateurs';

type RestOperateur = components['schemas']['RestOperateur'];

const PAGE_PAR_DEFAUT_DU_SERVEUR = 20;
const PAGE_MAXIMALE_DU_SERVEUR = 100;
const TOUT_UN_ATELIER = 60;
const PLUS_QUE_LE_SERVEUR_N_EN_REND = 137;
const TOUR_1 = { id: '11111111-2222-3333-4444-555555555555', libelle: 'Tour 1', nature: 'tournage' };

const JEAN_DUPONT = {
  id: '0a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d',
  nom: 'Dupont',
  prenom: 'Jean',
  matricule: '049',
  postes: [TOUR_1],
} satisfies RestOperateur;

const unOperateurFixture = (rang: number): RestOperateur => ({ id: `operateur-${rang}`, nom: `Nom ${rang}`, prenom: 'Jean' });

const unReferentielFixture = (nombre: number): RestOperateur[] => Array.from({ length: nombre }, (_, rang) => unOperateurFixture(rang));

const adapters: [string, () => OperateursPort][] = [['http', () => TestBed.inject(HttpOperateurs)]];

describe.each(adapters)('OperateursPort contract, honoured by %s', (_adapter, buildOperateurs) => {
  let operateurs: OperateursPort;
  let serveur: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), ClientApi, HttpOperateurs] });
    operateurs = buildOperateurs();
    serveur = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    serveur.verify();
  });

  it('should hand over the operators the referential holds, with the postes they are allowed on', async () => {
    const lecture = whenReadingOperators();

    await whenTheReferentialAnswersWith([JEAN_DUPONT]);

    thenItReadJeanDupont(await lecture);
  });

  it('should read past the page the server sends when it is asked for nothing', async () => {
    const lecture = whenReadingOperators();

    await whenTheReferentialAnswersWith(unReferentielFixture(TOUT_UN_ATELIER));

    thenItReadAWholeWorkshopOf(await lecture, TOUT_UN_ATELIER);
  });

  it('should say the extract is partial rather than cut the referential in silence', async () => {
    const lecture = whenReadingOperators();

    await whenTheReferentialAnswersWith(unReferentielFixture(PLUS_QUE_LE_SERVEUR_N_EN_REND));

    thenItSaysItMissesSome(await lecture, PLUS_QUE_LE_SERVEUR_N_EN_REND);
  });

  const unTourDeBoucle = (): Promise<void> => new Promise(resolve => setTimeout(resolve));

  const whenReadingOperators = (): Promise<Extrait<Operateur>> => operateurs.operateurs();

  const whenTheReferentialAnswersWith = async (referentiel: RestOperateur[]): Promise<void> => {
    await unTourDeBoucle();

    const requete = serveur.expectOne(demande => demande.url === '/api/operateurs');
    const demandee = Number(requete.request.params.get('size') ?? PAGE_PAR_DEFAUT_DU_SERVEUR);

    if (demandee > PAGE_MAXIMALE_DU_SERVEUR) {
      requete.flush(null, { status: 500, statusText: 'la taille de page demandée dépasse le plafond du serveur' });
      return;
    }

    requete.flush({ content: referentiel.slice(0, demandee), totalElementsCount: referentiel.length });
  };

  const thenItReadJeanDupont = (extrait: Extrait<Operateur>): void => {
    const [jean] = extrait.elements;

    expect(jean.id).toBe(JEAN_DUPONT.id);
    expect(jean.nom).toBe('Dupont');
    expect(jean.prenom).toBe('Jean');
    expect(jean.matchesCode('049')).toBe(true);
    expect(jean.postes).toEqual([{ id: TOUR_1.id, libelle: 'Tour 1' }]);
  };

  const thenItReadAWholeWorkshopOf = (extrait: Extrait<Operateur>, nombre: number): void => {
    expect(extrait.elements).toHaveLength(nombre);
    expect(extrait.isComplete()).toBe(true);
  };

  const thenItSaysItMissesSome = (extrait: Extrait<Operateur>, nombreTotal: number): void => {
    expect(extrait.nombreTotal).toBe(nombreTotal);
    expect(extrait.isComplete()).toBe(false);
  };
});
