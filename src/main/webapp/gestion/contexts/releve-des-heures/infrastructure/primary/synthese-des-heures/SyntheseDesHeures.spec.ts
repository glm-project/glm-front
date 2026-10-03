import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, ParamMap, Router } from '@angular/router';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import {
  elementFixture,
  instantFixture,
  jourTravailleFixture,
  OPERATEUR,
  releveFixture,
  SEMAINE_EN_COURS,
} from '@test/unit/fixtures/gestion/releve-des-heures/ReleveDesHeuresFixture';
import { SyntheseDesHeuresFixture } from '@test/unit/fixtures/gestion/releve-des-heures/SyntheseDesHeuresFixture';
import { dataSelector } from '@test/utils/DataSelector';
import { BehaviorSubject, EMPTY } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ElementReleveId } from '../../../domain/element/ElementReleveId';
import { PosteReleveId } from '../../../domain/element/PosteReleveId';
import { ActiviteReleveId } from '../../../domain/releve/ActiviteReleveId';
import { CibleDePointage } from '../../../domain/releve/CibleDePointage';
import { IdentiteOperateur } from '../../../domain/releve/IdentiteOperateur';
import { InstantDeReleve } from '../../../domain/releve/InstantDeReleve';
import { OperateurReleveId } from '../../../domain/releve/OperateurReleveId';
import { PointageReleveId } from '../../../domain/releve/PointageReleveId';
import { ReleveDesHeures } from '../../../domain/releve/ReleveDesHeures';
import { SequenceEnConflit } from '../../../domain/releve/SequenceEnConflit';
import { SyntheseDesHeuresPort } from '../../../domain/releve/SyntheseDesHeuresPort';
import { SemaineISO } from '../../../domain/semaine/SemaineISO';
import { SyntheseDesHeures } from './SyntheseDesHeures';

class RouteFixture {
  readonly paramMap = new BehaviorSubject<ParamMap>(convertToParamMap({ operateur: OPERATEUR }));
  readonly queryParamMap = new BehaviorSubject<ParamMap>(convertToParamMap({}));

  demande(annee: string, semaine: string): void {
    this.queryParamMap.next(convertToParamMap({ annee, semaine }));
  }

  demandeBrute(parametres: Record<string, string>): void {
    this.queryParamMap.next(convertToParamMap(parametres));
  }
}

interface UrlTreeFixture {
  readonly queryParams: Record<string, string>;
}

class RouterFixture {
  navigationDifferee: Promise<boolean> | undefined;
  navigationResult = true;
  navigationFailure: Error | undefined;
  readonly navigations: Record<string, number>[] = [];
  readonly events = EMPTY;

  createUrlTree(_commands: unknown[], extras?: { queryParams?: Record<string, string> }): UrlTreeFixture {
    return { queryParams: extras?.queryParams ?? {} };
  }

  serializeUrl(arbre: UrlTreeFixture): string {
    return `/?${new URLSearchParams(arbre.queryParams).toString()}`;
  }

  navigate(_commands: unknown[], extras?: { queryParams?: Record<string, number> }): Promise<boolean> {
    this.navigations.push(extras?.queryParams ?? {});
    if (this.navigationDifferee !== undefined) {
      return this.navigationDifferee;
    }
    return this.navigationFailure === undefined ? Promise.resolve(this.navigationResult) : Promise.reject(this.navigationFailure);
  }
}

const requiredFixture = <T>(value: T | undefined): T => {
  if (value === undefined) {
    throw new Error('Required scenario fixture is missing');
  }
  return value;
};

describe('Synthese des heures component', () => {
  let componentFixture: ComponentFixture<SyntheseDesHeures>;
  let portFixture: SyntheseDesHeuresFixture;
  let routeFixture: RouteFixture;
  let routerFixture: RouterFixture;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 17, 10, 0));
    portFixture = new SyntheseDesHeuresFixture();
    routeFixture = new RouteFixture();
    routerFixture = new RouterFixture();
    TestBed.configureTestingModule({
      providers: [
        { provide: ComponentFixtureAutoDetect, useValue: true },
        { provide: SyntheseDesHeuresPort, useValue: portFixture },
        { provide: ActivatedRoute, useValue: routeFixture },
        { provide: Router, useValue: routerFixture },
        { provide: ErrorHandlerPort, useClass: ErrorHandlerFixture },
      ],
    });
  });

  afterEach(() => {
    componentFixture.destroy();
    vi.useRealTimers();
  });

  it('should retain the actual consultation and selected clocking when operator navigation is cancelled', async () => {
    portFixture.identites = [
      { id: new OperateurReleveId(OPERATEUR), identite: new IdentiteOperateur('Dupont', 'Jean') },
      { id: new OperateurReleveId('op-2'), identite: new IdentiteOperateur('Évrard', 'Zoé') },
    ];
    givenReleve(
      releveFixture(
        SEMAINE_EN_COURS,
        { 0: { operationnelle: 'PT2H', pointagesDElement: [{ type: 'DEBUT', heure: [8, 0] }] } },
        { operationnelle: 'PT2H' },
      ),
    );
    routeFixture.demandeBrute({ annee: '2026', semaine: '38', jour: '2026-09-14' });
    routerFixture.navigationResult = false;
    await whenEcranAffiche();

    await whenEntreeDuJournalChoisie(0);
    await whenChoosingAnotherOperatorFromTheHeader();

    expect(texte('synthese-navigation-erreur')).toContain('Impossible de changer d’opérateur');
    expect(texte('synthese-identite')).toContain('Jean DUPONT');
    expect(texte('synthese-operationnel-total')).toBe('2 h 00');
    expect(entreesPressees()).toEqual(['08:00']);
    expect(errors()).toMatchObject({ errors: [] });
  });

  it('should report a rejected operator navigation once and retain the actual consultation', async () => {
    portFixture.identites = [
      { id: new OperateurReleveId(OPERATEUR), identite: new IdentiteOperateur('Dupont', 'Jean') },
      { id: new OperateurReleveId('op-2'), identite: new IdentiteOperateur('Évrard', 'Zoé') },
    ];
    givenReleve(releveFixture(SEMAINE_EN_COURS, {}, { operationnelle: 'PT2H' }));
    givenNavigationFailure();
    await whenEcranAffiche();

    await whenChoosingAnotherOperatorFromTheHeader();

    expect(texte('synthese-navigation-erreur')).toContain('Impossible de changer d’opérateur');
    expect(texte('synthese-identite')).toContain('Jean DUPONT');
    expect(errors()).toMatchObject({ errors: [new Error('Navigation indisponible')] });
  });

  it('should ignore the cancellation of an older choice superseded by a newer navigation', async () => {
    portFixture.identites = [
      { id: new OperateurReleveId(OPERATEUR), identite: new IdentiteOperateur('Dupont', 'Jean') },
      { id: new OperateurReleveId('op-2'), identite: new IdentiteOperateur('Évrard', 'Zoé') },
    ];
    givenReleve(releveFixture(SEMAINE_EN_COURS, {}));
    const release = givenDelayedNavigation();
    await whenEcranAffiche();

    await whenANewerChoiceSupersedesTheNavigation(release);

    expect(present('synthese-navigation-erreur')).toBe(false);
    expect(texte('synthese-identite')).toContain('Jean DUPONT');
  });

  it.each([{ jour: '2026-09-14' }, {}])('should keep the unavailable report consultation after a failed choice with day %j', async jour => {
    givenNavigationOperators();
    givenLectureEnEchec();
    routeFixture.demandeBrute({ annee: '2026', semaine: '38', ...jour });
    routerFixture.navigationResult = false;
    await whenEcranAffiche();

    await whenChoosingAnotherOperatorFromTheHeader();

    expect(present('synthese-error')).toBe(true);
    expect(texte('synthese-navigation-erreur')).toContain('Impossible de changer d’opérateur');
    expect(texte('selecteur-operateur')).toContain('Jean DUPONT');
  });

  it('should keep a past consultation with no automatically open day after a cancelled operator choice', async () => {
    givenNavigationOperators();
    const semaine = new SemaineISO(2026, 37);
    givenReleveDe(semaine, releveFixture(semaine, {}));
    routeFixture.demandeBrute({ annee: '2026', semaine: '37' });
    routerFixture.navigationResult = false;
    await whenEcranAffiche();

    await whenChoosingAnotherOperatorFromTheHeader();

    expect(joursOuverts()).toEqual([]);
    expect(texte('synthese-navigation-erreur')).toContain('Impossible de changer d’opérateur');
  });

  it('should close a current-operator choice without leaving the acquired consultation', async () => {
    givenNavigationOperators();
    givenReleve(releveFixture(SEMAINE_EN_COURS, {}, { operationnelle: 'PT2H' }));
    await whenEcranAffiche();

    await whenChoosingCurrentOperatorFromTheHeader();

    expect(present('synthese-navigation-erreur')).toBe(false);
    expect(texte('synthese-operationnel-total')).toBe('2 h 00');
    expect(portFixture.demandes).toHaveLength(1);
  });

  it('should keep the newly opened day when a navigation from the old day is cancelled', async () => {
    givenNavigationOperators();
    givenReleve(releveFixture(SEMAINE_EN_COURS, {}));
    const release = givenDelayedNavigation();
    await whenEcranAffiche();

    await whenTheDayChangesBeforeNavigationAnswers(release);

    expect(joursOuverts()).toEqual(['mar. 15']);
    expect(present('synthese-navigation-erreur')).toBe(false);
  });

  it('should render a neutral identity if the unknown route operator is absent from the acquired list', async () => {
    givenNavigationOperators();
    givenOperateurInconnu();
    portFixture.identites = portFixture.identites.slice(1);

    await whenEcranAffiche();

    expect(texte('selecteur-operateur')).toContain('Choisir un opérateur');
    expect(present('synthese-operateur-introuvable')).toBe(true);
  });

  it('should keep a failed operator list local to the still readable report', async () => {
    givenReleve(releveFixture(SEMAINE_EN_COURS, {}, { operationnelle: 'PT2H' }));
    portFixture.operateursFailure = new Error('Référentiel indisponible');

    await whenEcranAffiche();

    expect(present('selecteur-operateur-erreur')).toBe(true);
    expect(texte('synthese-operationnel-total')).toBe('2 h 00');
    expect(texte('selecteur-operateur')).toContain('Jean DUPONT');
  });

  it('should show separate acquisition failures and a neutral operator if neither identity source is available', async () => {
    givenLectureEnEchec();
    portFixture.operateursFailure = new Error('Référentiel indisponible');

    await whenEcranAffiche();

    expect(present('synthese-error')).toBe(true);
    expect(present('selecteur-operateur-erreur')).toBe(true);
    expect(texte('selecteur-operateur')).toContain('Choisir un opérateur');
  });

  it('should offer no operator acquisition control from a refused day after the mounted list fails', async () => {
    givenReleve(releveFixture(SEMAINE_EN_COURS, {}));
    portFixture.operateursFailure = new Error('Référentiel indisponible');
    await whenEcranAffiche();

    await whenAnotherDayIsOpened('2026-09-21');

    expect(present('synthese-adresse-invalide')).toBe(true);
    expect(present('selecteur-operateur-reessayer')).toBe(false);
    expect(present('selecteur-operateur')).toBe(false);
  });

  it('should refuse a choice if the address becomes invalid while the operator panel is open', async () => {
    givenNavigationOperators();
    givenReleve(releveFixture(SEMAINE_EN_COURS, {}));
    await whenEcranAffiche();

    await whenTheAddressBecomesInvalidBeforeChoosing();

    expect(present('synthese-adresse-invalide')).toBe(true);
    expect(present('synthese-navigation-erreur')).toBe(false);
    expect(portFixture.demandes).toHaveLength(1);
  });

  const whenTheAddressBecomesInvalidBeforeChoosing = async (): Promise<void> => {
    requis('selecteur-operateur').click();
    await componentFixture.whenStable();
    const proposals = document.querySelectorAll<HTMLButtonElement>(dataSelector('selecteur-operateur-proposition'));
    routeFixture.demandeBrute({ annee: '2026', semaine: '38', jour: '2026-09-21' });
    requiredFixture(proposals[1]).click();
    await Promise.resolve();
    componentFixture.detectChanges();
    await componentFixture.whenStable();
  };

  const givenNavigationOperators = (): void => {
    portFixture.identites = [
      { id: new OperateurReleveId(OPERATEUR), identite: new IdentiteOperateur('Dupont', 'Jean') },
      { id: new OperateurReleveId('op-2'), identite: new IdentiteOperateur('Évrard', 'Zoé') },
    ];
  };

  const whenChoosingCurrentOperatorFromTheHeader = async (): Promise<void> => {
    requis('selecteur-operateur').click();
    await componentFixture.whenStable();
    const proposals = document.querySelectorAll<HTMLButtonElement>(dataSelector('selecteur-operateur-proposition'));
    requiredFixture(proposals[0]).click();
    await componentFixture.whenStable();
  };

  const whenTheDayChangesBeforeNavigationAnswers = async (release: () => void): Promise<void> => {
    await whenChoosingAnotherOperatorFromTheHeader();
    await whenAnotherDayIsOpened('2026-09-15');
    release();
    await Promise.resolve();
    componentFixture.detectChanges();
    await componentFixture.whenStable();
  };

  const errors = (): ErrorHandlerPort => TestBed.inject(ErrorHandlerPort);
  const givenNavigationFailure = (): void => {
    routerFixture.navigationFailure = new Error('Navigation indisponible');
  };

  const givenDelayedNavigation = (): (() => void) => {
    let release = (): void => undefined;
    routerFixture.navigationDifferee = new Promise(resolve => {
      release = () => {
        resolve(false);
      };
    });
    return release;
  };

  const whenANewerChoiceSupersedesTheNavigation = async (release: () => void): Promise<void> => {
    await whenChoosingAnotherOperatorFromTheHeader();
    routerFixture.navigationDifferee = undefined;
    await whenChoosingAnotherOperatorFromTheHeader();
    release();
    await Promise.resolve();
    componentFixture.detectChanges();
    await componentFixture.whenStable();
  };

  const whenChoosingAnotherOperatorFromTheHeader = async (): Promise<void> => {
    const trigger = requis('selecteur-operateur');
    trigger.click();
    componentFixture.detectChanges();
    await componentFixture.whenStable();
    const proposals = document.querySelectorAll<HTMLButtonElement>(dataSelector('selecteur-operateur-proposition'));
    requiredFixture(proposals[1]).click();
    await Promise.resolve();
    componentFixture.detectChanges();
    await componentFixture.whenStable();
  };

  it('should show a received two-hour activity without any arrival or presence row', async () => {
    givenReleve(
      releveFixture(
        SEMAINE_EN_COURS,
        {
          0: { operationnelle: 'PT2H', intervalles: [{ debut: [8, 0], fin: [10, 0] }] },
        },
        { operationnelle: 'PT2H' },
        [elementFixture({ reference: '1015', duree: 'PT2H' })],
      ),
    );
    routeFixture.demandeBrute({ annee: '2026', semaine: '38', jour: '2026-09-14' });

    await whenEcranAffiche();

    expect(present('synthese-presence-libelle')).toBe(false);
    expect(texte('synthese-operationnel-total')).toBe('2 h 00');
    expect(textes('synthese-operationnel-jour')[0]).toBe('2 h 00');
    expect(titresDe(barresDe('travail'))).toEqual(['Moule 1015, lundi 14, 08:00 à 10:00, travail']);
    expect(marquesDuJourOuvert()).toEqual([]);
  });

  it('should keep two concurrently worked elements with their received one-hour totals and two-hour weekly total', async () => {
    givenReleve(
      releveFixture(
        SEMAINE_EN_COURS,
        {
          0: {
            operationnelle: 'PT2H',
            intervalles: [
              {
                element: 'element-1',
                debut: [8, 0],
                fin: [9, 0],
                activite: {
                  id: new ActiviteReleveId('a'),
                  debut: instantFixture(0, [8, 0]),
                  fin: instantFixture(0, [9, 0]),
                  etat: 'TERMINEE',
                },
              },
              {
                element: 'element-2',
                debut: [8, 0],
                fin: [9, 0],
                activite: {
                  id: new ActiviteReleveId('b'),
                  debut: instantFixture(0, [8, 0]),
                  fin: instantFixture(0, [9, 0]),
                  etat: 'TERMINEE',
                },
              },
            ],
          },
        },
        { operationnelle: 'PT2H' },
        [
          elementFixture({ id: 'element-1', reference: '1015', duree: 'PT1H' }),
          elementFixture({ id: 'element-2', reference: '2015', duree: 'PT1H' }),
        ],
      ),
    );

    await whenEcranAffiche();

    expect([textes('synthese-element-total'), texte('synthese-operationnel-total')]).toEqual([['1 h 00', '1 h 00'], '2 h 00']);
    expect(barresDe('travail')).toHaveLength(2);
  });

  it('should name the origin of an activity begun on Sunday and still in progress on Monday without a fabricated end', async () => {
    givenReleve(
      releveFixture(SEMAINE_EN_COURS, {
        0: {
          intervalles: [
            {
              debut: [0, 0],
              activite: {
                id: new ActiviteReleveId('dimanche-22'),
                debut: new InstantDeReleve(new Date(2026, 8, 13, 22).toISOString()),
                etat: 'EN_COURS',
              },
            },
          ],
        },
      }),
    );
    routeFixture.demandeBrute({ annee: '2026', semaine: '38', jour: '2026-09-14' });

    await whenEcranAffiche();

    expect(titresDe(barresDe('en-cours'))[0]).toContain('depuis dimanche 13 à 22:00');
    expect(textes('synthese-activite-etat')).toEqual(['En cours depuis dimanche 13 à 22:00']);
    expect(barresDe('en-cours')[0]?.style.width).toBe('');
    expect(textes('synthese-operationnel-jour')[0]).toBe('0 h 00');
    expect(marquesDuJourOuvert()).toEqual([]);
  });

  it('should show the received four-hour and eight-hour portions of one night activity on nonempty days', async () => {
    const origine = {
      id: new ActiviteReleveId('nuit'),
      debut: instantFixture(0, [20, 0]),
      fin: instantFixture(1, [8, 0]),
      etat: 'TERMINEE' as const,
    };
    givenReleve(
      releveFixture(
        SEMAINE_EN_COURS,
        {
          0: { operationnelle: 'PT4H', intervalles: [{ debut: [20, 0], fin: [24, 0], activite: origine }] },
          1: { operationnelle: 'PT8H', intervalles: [{ debut: [0, 0], fin: [8, 0], activite: origine }] },
        },
        { operationnelle: 'PT12H' },
        [elementFixture({ duree: 'PT12H' })],
      ),
    );

    await whenEcranAffiche();

    expect(textes('synthese-operationnel-jour').slice(0, 2)).toEqual(['4 h 00', '8 h 00']);
    expect(barresParJour().slice(0, 2)).toEqual([1, 1]);
    expect(texte('synthese-operationnel-total')).toBe('12 h 00');
  });

  it('should name an unresolved activity on every received possible day without a certain duration or a progress bar', async () => {
    const origine = {
      id: new ActiviteReleveId('a'),
      debut: instantFixture(0, [8, 0]),
      etat: 'A_RESOUDRE' as const,
      finAuPlusTard: instantFixture(1, [17, 0]),
    };
    givenReleve(
      releveFixture(
        SEMAINE_EN_COURS,
        {
          0: { operationnelle: false, intervalles: [{ debut: [8, 0], activite: origine }] },
          1: { operationnelle: false, intervalles: [{ debut: [0, 0], activite: origine }] },
        },
        { operationnelle: false },
        [elementFixture({ duree: false })],
      ),
    );

    await whenEcranAffiche();

    expect(textes('synthese-activite-etat')).toEqual(['À résoudre', 'À résoudre']);
    expect(barresDe('a-resoudre').map(barre => barre.style.width)).toEqual(['', '']);
    expect(textes('synthese-operationnel-jour').slice(0, 2)).toEqual(['Incomplet', 'Incomplet']);
    expect(barresDe('en-cours')).toHaveLength(0);
    expect(titresDe(barresDe('a-resoudre')).every(titre => titre.includes('À résoudre'))).toBe(true);
  });

  it.each([false, true])(
    'should show a conflict and its targeted facts without deriving total completeness from the conflict (%s)',
    async incomplet => {
      const conflit = new SequenceEnConflit(
        new CibleDePointage(new ElementReleveId('element-1'), new PosteReleveId('poste-0')),
        incomplet ? [new ActiviteReleveId('a'), new ActiviteReleveId('nc-b')] : [],
        [new PointageReleveId('nc-b'), new PointageReleveId('fin-a'), new PointageReleveId('hors-semaine')],
      );
      givenReleve(
        releveFixture(
          SEMAINE_EN_COURS,
          {
            0: {
              operationnelle: incomplet ? false : 'PT2H',
              pointagesDElement: [
                {
                  id: 'nc-b',
                  type: 'NON_CONFORMITE',
                  heure: [12, 0],
                  poste: 'poste-0',
                  intention: { type: 'TRANSITION', activiteVisee: new ActiviteReleveId('a') },
                },
                {
                  id: 'fin-a',
                  type: 'FIN',
                  heure: [17, 0],
                  poste: 'poste-0',
                  intention: { type: 'FIN', activiteVisee: new ActiviteReleveId('a') },
                },
              ],
            },
          },
          { operationnelle: incomplet ? false : 'PT2H' },
          [elementFixture({ reference: '1015', duree: incomplet ? false : 'PT2H', postes: [['DMU 50', undefined]] })],
          [conflit],
        ),
      );

      await whenEcranAffiche();

      expect(texte('synthese-conflits-titre')).toBe('Séquences en conflit');
      expect(textes('synthese-conflit-element')).toEqual(['Moule 1015 · DMU 50']);
      expect(textes('synthese-conflit-fait')).toEqual([
        'Non-conformité 12:00 · Transition de l’activité a · nc-b',
        'Fin 17:00 · Fin de l’activité a · fin-a',
        'Pointage hors-semaine',
      ]);
      expect(texte('synthese-operationnel-total')).toBe(incomplet ? 'Incomplet' : '2 h 00');
      expect(textes('synthese-conflit-activites')).toEqual(incomplet ? ['Activités concernées : a, nc-b'] : []);
    },
  );

  it.each([
    [false, 'PT1H', 'Incomplet', 'NC 1 h 00'],
    ['PT2H', false, '2 h 00', 'NC Incomplet'],
    [false, false, 'Incomplet', 'NC Incomplet'],
  ] as const)(
    'should display an incomplete work or NC total without a partial number (%s, %s)',
    async (travail, nc, attendu, attenduNC) => {
      givenReleve(
        releveFixture(SEMAINE_EN_COURS, { 0: { operationnelle: false } }, { operationnelle: false }, [
          elementFixture({ duree: travail, dureeNonConformite: nc }),
        ]),
      );

      await whenEcranAffiche();

      expect(texte('synthese-operationnel-total')).toBe('Incomplet');
      expect(textes('synthese-operationnel-jour')[0]).toBe('Incomplet');
      expect(textes('synthese-element-total')).toEqual([attendu]);
      expect(textes('synthese-element-nc')).toEqual([attenduNC]);
      expect(titres('synthese-operationnel-total')).toEqual(['']);
    },
  );

  it.each([
    ['at the automatic deadline', 8, 21, 'TERMINEE_AUTOMATIQUEMENT', 'PT13H', undefined, '13 h 00', true],
    ['on a later read', 8, 21, 'TERMINEE_AUTOMATIQUEMENT', 'PT13H', undefined, '13 h 00', true],
    ['after a late received end at 17:00', 8, 17, 'TERMINEE', 'PT9H', 17, '9 h 00', false],
    ['after an ordinary end at 23:00', 8, 21, 'TERMINEE_AUTOMATIQUEMENT', 'PT13H', 23, '13 h 00', true],
    ['after regularisation to 23:00', 8, 23, 'TERMINEE', 'PT15H', 23, '15 h 00', false],
    ['after the opening was corrected to 12:00', 12, undefined, 'EN_COURS', 'PT0S', undefined, '0 h 00', false],
  ] as const)(
    'should display the server activity %s without inferring its state from raw ends',
    async (_cas, debut, fin, etat, duree, finBrute, attendu, automatique) => {
      const origine =
        etat === 'EN_COURS'
          ? { id: new ActiviteReleveId('a'), debut: instantFixture(0, [debut, 0]), etat }
          : {
              id: new ActiviteReleveId('a'),
              debut: instantFixture(0, [debut, 0]),
              fin: instantFixture(0, [requiredFixture(fin), 0]),
              etat,
            };
      givenReleve(
        releveFixture(
          SEMAINE_EN_COURS,
          {
            0: {
              operationnelle: duree,
              intervalles: [{ debut: [debut, 0], ...(fin === undefined ? {} : { fin: [fin, 0] as const }), activite: origine }],
              pointagesDElement: [
                { id: 'a', type: 'DEBUT', heure: [debut, 0] },
                ...(finBrute === undefined
                  ? []
                  : [
                      {
                        id: 'fin-a',
                        type: 'FIN' as const,
                        heure: [finBrute, 0] as const,
                        intention: { type: 'FIN' as const, activiteVisee: new ActiviteReleveId('a') },
                      },
                    ]),
              ],
            },
          },
          { operationnelle: duree },
          [elementFixture({ reference: '1015', duree })],
        ),
      );
      routeFixture.demandeBrute({ annee: '2026', semaine: '38', jour: '2026-09-14' });

      await whenEcranAffiche();

      expect(texte('synthese-operationnel-total')).toBe(attendu);
      expect(textes('synthese-activite-etat').some(mention => mention === 'Fin automatique à 21:00 · Anomalie')).toBe(automatique);
      expect(barresDe(etat === 'EN_COURS' ? 'en-cours' : 'travail')[0]?.dataset['automatique']).toBe(String(automatique));
      expect(marquesDuJourOuvert()).toEqual(
        finBrute === undefined
          ? [`Début ${String(debut).padStart(2, '0')}:00`]
          : [`Début ${String(debut).padStart(2, '0')}:00`, `Fin ${String(finBrute).padStart(2, '0')}:00`],
      );
    },
  );

  it.each([
    [37, 6, [22, 0], [24, 0], 'PT2H', '2 h 00'],
    [38, 0, [0, 0], [3, 0], 'PT3H', '3 h 00'],
  ] as const)(
    'should keep the received portion in week %s after the Sunday activity ends Monday at 03:00',
    async (numero, rang, debut, fin, duree, attendu) => {
      const semaine = new SemaineISO(2026, numero);
      const origine = {
        id: new ActiviteReleveId('dimanche-22'),
        debut: new InstantDeReleve(new Date(2026, 8, 13, 22).toISOString()),
        fin: new InstantDeReleve(new Date(2026, 8, 14, 3).toISOString()),
        etat: 'TERMINEE' as const,
      };
      givenReleveDe(
        semaine,
        releveFixture(
          semaine,
          { [rang]: { operationnelle: duree, intervalles: [{ debut, fin, activite: origine }] } },
          { operationnelle: duree },
          [elementFixture({ duree })],
        ),
      );
      routeFixture.demandeBrute({ annee: '2026', semaine: String(numero), jour: requiredFixture(semaine.jours()[rang]).value });

      await whenEcranAffiche();

      expect(textes('synthese-operationnel-jour')[rang]).toBe(attendu);
      expect(texte('synthese-operationnel-total')).toBe(attendu);
      expect(barresDe('travail')).toHaveLength(1);
      expect(marquesDuJourOuvert()).toEqual([]);
    },
  );

  it.each([
    ['synthese-semaine-libelle', 'Semaine 38 · 14–20 sept. 2026'],
    ['synthese-identite', 'Jean DUPONT'],
  ])('should display %s as %s for the week containing today', async (selector, attendu) => {
    givenSemaineSemee(new SemaineISO(2026, 38));

    await whenEcranAffiche();

    expect(texte(selector)).toBe(attendu);
  });

  it('should display the operational time of each day as the server counted it, a dash for a day without clocking', async () => {
    givenReleve(
      releveFixture(SEMAINE_EN_COURS, {
        0: {
          operationnelle: 'PT5H10M',
          pointagesDElement: [
            { type: 'DEBUT', heure: [8, 0] },
            { type: 'FIN', heure: [14, 0] },
          ],
        },
        1: {
          pointagesDElement: [
            { type: 'DEBUT', heure: [8, 0] },
            { type: 'FIN', heure: [8, 0] },
          ],
        },
      }),
    );

    await whenEcranAffiche();

    expect(textes('synthese-operationnel-jour')).toEqual(['5 h 10', '0 h 00', '—', '—', '—', '—', '—']);
  });

  it('should display the operational time of the week as the server counted it', async () => {
    givenReleve(releveFixture(SEMAINE_EN_COURS, {}, { operationnelle: 'PT57H30M' }));

    await whenEcranAffiche();

    expect(texte('synthese-operationnel-total')).toBe('57 h 30');
  });

  it('should title the screen with the operational time, the client word', async () => {
    givenSemaineSemee(new SemaineISO(2026, 38));

    await whenEcranAffiche();

    expect(texte('synthese-titre')).toBe('Temps opérationnel');
  });

  it('should give each element of the week its row, named by its type, its number, its label and its workstations', async () => {
    givenReleve(
      releveFixture(SEMAINE_EN_COURS, {}, {}, [
        elementFixture({
          type: 'PRODUIT',
          reference: '1015',
          description: 'Carter de pompe',
          postes: [
            ['DMU 50', 'Fraisage'],
            ['Mazak QT-200', undefined],
          ],
        }),
        elementFixture({ id: 'element-2', type: 'ORDRE_DE_FABRICATION', nom: 'OF-2026-000057' }),
      ]),
    );

    await whenEcranAffiche();

    expect([
      textes('synthese-element-type'),
      textes('synthese-element-numero'),
      textes('synthese-element-libelle'),
      textes('synthese-element-postes'),
    ]).toEqual([
      ['Moule', 'OF'],
      ['1015', 'OF-2026-000057'],
      ['Carter de pompe', ''],
      ['DMU 50 · Fraisage, Mazak QT-200', ''],
    ]);
  });

  it('should give each element row its week total as the server counted it', async () => {
    givenReleve(
      releveFixture(SEMAINE_EN_COURS, {}, {}, [
        elementFixture({ duree: 'PT15H30M' }),
        elementFixture({ id: 'element-2', duree: 'PT2H5M' }),
      ]),
    );

    await whenEcranAffiche();

    expect(textes('synthese-element-total')).toEqual(['15 h 30', '2 h 05']);
  });

  it('should keep the row of an element that no bar draws, its total at zero', async () => {
    givenReleve(releveFixture(SEMAINE_EN_COURS, {}, {}, [elementFixture({ reference: '1015' })]));

    await whenEcranAffiche();

    expect([textes('synthese-element-numero'), textes('synthese-element-total')]).toEqual([['1015'], ['0 h 00']]);
  });

  it('should tell the non-conformity time of an element beside its total, and nothing for an element without any', async () => {
    givenReleve(
      releveFixture(SEMAINE_EN_COURS, {}, {}, [
        elementFixture({ duree: 'PT15H30M', dureeNonConformite: 'PT50M' }),
        elementFixture({ id: 'element-2', duree: 'PT2H' }),
      ]),
    );

    await whenEcranAffiche();

    expect(textes('synthese-element-nc')).toEqual(['NC 0 h 50']);
  });

  it('should draw the work of an element on its row, in the column of its day', async () => {
    givenReleve(releveFixture(SEMAINE_EN_COURS, { 0: { intervalles: [{ debut: [8, 0], fin: [12, 0] }] } }, {}, [elementFixture()]));

    await whenEcranAffiche();

    expect(barresParJour()).toEqual([1, 0, 0, 0, 0, 0, 0]);
  });

  it('should draw a non-conformity apart from the work it follows, at its own place', async () => {
    givenReleve(
      releveFixture(
        SEMAINE_EN_COURS,
        {
          0: {
            intervalles: [
              { debut: [8, 0], fin: [12, 0] },
              { categorie: 'NON_CONFORMITE', debut: [12, 0], fin: [14, 0] },
            ],
          },
        },
        {},
        [elementFixture()],
      ),
    );

    await whenEcranAffiche();

    expect([barresDe('travail').length, barresDe('nc').length]).toEqual([1, 1]);
  });

  it('should state each bar by its element, its day, its hours and whether it is work or non-conformity', async () => {
    givenReleve(
      releveFixture(
        SEMAINE_EN_COURS,
        {
          0: {
            intervalles: [
              { debut: [8, 0], fin: [12, 0] },
              { categorie: 'NON_CONFORMITE', debut: [12, 0], fin: [14, 0] },
            ],
            pointagesDElement: [
              { type: 'DEBUT', heure: [8, 0] },
              { type: 'NON_CONFORMITE', heure: [12, 0] },
              { type: 'FIN', heure: [14, 0] },
            ],
          },
        },
        {},
        [elementFixture({ reference: '1015' })],
      ),
    );

    await whenEcranAffiche();

    expect([textesDe(barresDe('travail')), titresDe(barresDe('travail')), textesDe(barresDe('nc'))]).toEqual([
      ['Moule 1015, lundi 14, 08:00 à 12:00, travail'],
      ['Moule 1015, lundi 14, 08:00 à 12:00, travail'],
      ['Moule 1015, lundi 14, 12:00 à 14:00, non-conformité'],
    ]);
  });

  it.each([
    ['starts before the daytime hours', [5, 30], [7, 0]],
    ['goes on past midnight', [21, 0], [24, 0]],
  ] as const)('should open the axis of a day onto the whole day when the work of an element %s', async (_cas, debut, fin) => {
    givenReleve(
      releveFixture(SEMAINE_EN_COURS, { 0: { intervalles: [{ debut, fin }], pointagesDElement: [{ type: 'DEBUT', heure: [8, 0] }] } }, {}, [
        elementFixture(),
      ]),
    );

    await whenEcranAffiche();

    expect(reperesDuJour(0)).toEqual(['0 h', '24 h']);
  });

  it('should keep the closed portion without manufacturing a raw end clocking', async () => {
    givenReleve(
      releveFixture(
        SEMAINE_EN_COURS,
        { 0: { intervalles: [{ debut: [8, 0], fin: [10, 0] }], pointagesDElement: [{ type: 'DEBUT', heure: [8, 0] }] } },
        {},
        [elementFixture({ reference: '1015' })],
      ),
    );
    routeFixture.demandeBrute({ annee: '2026', semaine: '38', jour: '2026-09-14' });

    await whenEcranAffiche();

    expect([textesDe(barresDe('travail')), marquesDuJourOuvert()]).toEqual([
      ['Moule 1015, lundi 14, 08:00 à 10:00, travail'],
      ['Début 08:00'],
    ]);
  });

  it('should mark the work still in progress, and state it as in progress', async () => {
    givenReleve(
      releveFixture(SEMAINE_EN_COURS, { 0: { intervalles: [{ debut: [10, 20] }] } }, {}, [elementFixture({ reference: '1015' })]),
    );

    await whenEcranAffiche();

    expect([textesDe(barresDe('en-cours')), barresDe('travail').length]).toEqual([
      ['Moule 1015, lundi 14, depuis 10:20, travail, en cours'],
      0,
    ]);
  });

  it('should split the row of an element worked from two workstations at once into one sub-row per workstation, its total staying on its row', async () => {
    givenReleve(
      releveFixture(
        SEMAINE_EN_COURS,
        {
          0: {
            intervalles: [
              { poste: 'poste-0', debut: [8, 0], fin: [12, 0] },
              { poste: 'poste-1', debut: [10, 0], fin: [14, 0] },
            ],
          },
        },
        {},
        [
          elementFixture({
            duree: 'PT8H',
            postes: [
              ['DMU 50', 'Fraisage'],
              ['Mazak QT-200', 'Tournage'],
            ],
          }),
        ],
      ),
    );

    await whenEcranAffiche();

    expect([textes('synthese-sous-ligne-poste'), barresParSousLigne(), textes('synthese-element-total')]).toEqual([
      ['DMU 50', 'Mazak QT-200'],
      [
        [1, 0, 0, 0, 0, 0, 0],
        [1, 0, 0, 0, 0, 0, 0],
      ],
      ['8 h 00'],
    ]);
  });

  it('should keep whole the row of an element worked from two workstations one after the other', async () => {
    givenReleve(
      releveFixture(
        SEMAINE_EN_COURS,
        {
          0: {
            intervalles: [
              { poste: 'poste-0', debut: [8, 0], fin: [12, 0] },
              { poste: 'poste-1', debut: [12, 0], fin: [14, 0] },
            ],
          },
        },
        {},
        [
          elementFixture({
            postes: [
              ['DMU 50', 'Fraisage'],
              ['Mazak QT-200', 'Tournage'],
            ],
          }),
        ],
      ),
    );

    await whenEcranAffiche();

    expect([nombreDe('synthese-sous-ligne'), barresDe('travail').length]).toEqual([0, 2]);
  });

  it.each([
    [
      'after',
      [
        { poste: 'poste-0', debut: [8, 0], fin: [12, 0] },
        { poste: 'poste-1', debut: [10, 0] },
      ],
    ],
    [
      'before',
      [
        { poste: 'poste-1', debut: [10, 0] },
        { poste: 'poste-0', debut: [8, 0], fin: [12, 0] },
      ],
    ],
  ] as const)(
    'should split the row of an element for an interval still in progress that started within a closed one, listed %s it',
    async (_cas, intervalles) => {
      givenReleve(
        releveFixture(SEMAINE_EN_COURS, { 0: { intervalles } }, {}, [
          elementFixture({
            postes: [
              ['DMU 50', 'Fraisage'],
              ['Mazak QT-200', 'Tournage'],
            ],
          }),
        ]),
      );

      await whenEcranAffiche();

      expect(textes('synthese-sous-ligne-poste')).toEqual(['DMU 50', 'Mazak QT-200']);
    },
  );

  it('should give a workstation one sub-row when the element carries it for several natures', async () => {
    givenReleve(
      releveFixture(
        SEMAINE_EN_COURS,
        {
          0: {
            intervalles: [
              { poste: 'poste-0', debut: [8, 0], fin: [12, 0] },
              { poste: 'poste-2', debut: [10, 0], fin: [14, 0] },
            ],
          },
        },
        {},
        [
          elementFixture({
            postes: [
              ['DMU 50', 'Fraisage'],
              ['DMU 50', 'Perçage', 'poste-0'],
              ['Mazak QT-200', 'Tournage'],
            ],
          }),
        ],
      ),
    );

    await whenEcranAffiche();

    expect(textes('synthese-sous-ligne-poste')).toEqual(['DMU 50', 'Mazak QT-200']);
  });

  it('should split the row of an element worked from two workstations at once that are both still in progress', async () => {
    givenReleve(
      releveFixture(
        SEMAINE_EN_COURS,
        {
          0: {
            intervalles: [
              { poste: 'poste-0', debut: [8, 0] },
              { poste: 'poste-1', debut: [10, 0] },
            ],
          },
        },
        {},
        [
          elementFixture({
            postes: [
              ['DMU 50', 'Fraisage'],
              ['Mazak QT-200', 'Tournage'],
            ],
          }),
        ],
      ),
    );

    await whenEcranAffiche();

    expect([textes('synthese-sous-ligne-poste'), barresDe('en-cours').length]).toEqual([['DMU 50', 'Mazak QT-200'], 2]);
  });

  it('should put the work of a split element that has no workstation on a row of its own, said to have none', async () => {
    givenReleve(
      releveFixture(
        SEMAINE_EN_COURS,
        {
          0: {
            intervalles: [
              { poste: 'poste-0', debut: [8, 0], fin: [12, 0] },
              { debut: [10, 0], fin: [14, 0] },
            ],
          },
        },
        {},
        [elementFixture({ postes: [['DMU 50', 'Fraisage']] })],
      ),
    );

    await whenEcranAffiche();

    expect(textes('synthese-sous-ligne-poste')).toEqual(['DMU 50', 'Sans poste']);
  });

  it('should split the whole week of an element as soon as two of its intervals overlap, each interval on the row of its workstation', async () => {
    givenReleve(
      releveFixture(
        SEMAINE_EN_COURS,
        {
          0: {
            intervalles: [
              { poste: 'poste-0', debut: [8, 0], fin: [12, 0] },
              { poste: 'poste-1', debut: [10, 0], fin: [14, 0] },
            ],
          },
          1: { intervalles: [{ poste: 'poste-1', debut: [8, 0], fin: [9, 0] }] },
        },
        {},
        [
          elementFixture({
            postes: [
              ['DMU 50', 'Fraisage'],
              ['Mazak QT-200', 'Tournage'],
            ],
          }),
        ],
      ),
    );

    await whenEcranAffiche();

    expect(barresParSousLigne()).toEqual([
      [1, 0, 0, 0, 0, 0, 0],
      [1, 1, 0, 0, 0, 0, 0],
    ]);
  });

  it('should give each of the seven days its column', async () => {
    givenSemaineSemee(new SemaineISO(2026, 38));

    await whenEcranAffiche();

    expect(textes('synthese-jour')).toEqual(['lun. 14', 'mar. 15', 'mer. 16', 'jeu. 17', 'ven. 18', 'sam. 19', 'dim. 20']);
  });

  it('should mark the daytime hours under the name of a day that carries something, and nothing under an empty one', async () => {
    givenSemaineSemee(new SemaineISO(2026, 38));

    await whenEcranAffiche();

    expect([reperesDuJour(0), reperesDuJour(6)]).toEqual([
      ['0 h', '24 h'],
      ['0 h', '24 h'],
    ]);
  });

  it('should open today on the week in progress when the address names no day, empty as today may be', async () => {
    givenSemaineSemee(new SemaineISO(2026, 38));

    await whenEcranAffiche();

    expect(joursOuverts()).toEqual(['jeu. 17']);
  });

  it('should link each day to its own address, in the week that is shown', async () => {
    givenSemaineSemee(new SemaineISO(2026, 38));

    await whenEcranAffiche();

    expect([cibleDuLien('synthese-jour-lien', 0), cibleDuLien('synthese-jour-lien', 6)]).toEqual([
      { annee: '2026', semaine: '38', jour: '2026-09-14' },
      { annee: '2026', semaine: '38', jour: '2026-09-20' },
    ]);
  });

  it('should open the day the address names, and only that one', async () => {
    givenSemaineSemee(new SemaineISO(2026, 38));
    routeFixture.demandeBrute({ annee: '2026', semaine: '38', jour: '2026-09-16' });

    await whenEcranAffiche();

    expect(joursOuverts()).toEqual(['mer. 16']);
  });

  it('should open the first day that carries a clocking on a past week, when the address names no day', async () => {
    givenReleveDe(
      new SemaineISO(2026, 37),
      releveFixture(new SemaineISO(2026, 37), {
        1: { pointagesDElement: [{ type: 'DEBUT', heure: [8, 0] }] },
        4: { pointagesDElement: [{ type: 'DEBUT', heure: [8, 0] }] },
      }),
    );
    routeFixture.demande('2026', '37');

    await whenEcranAffiche();

    expect(joursOuverts()).toEqual(['mar. 8']);
  });

  it('should open no day on a past week that carries no clocking', async () => {
    givenReleveDe(new SemaineISO(2026, 37), releveFixture(new SemaineISO(2026, 37), {}));
    routeFixture.demande('2026', '37');

    await whenEcranAffiche();

    expect(joursOuverts()).toEqual([]);
  });

  it('should leave the day out of the links to the neighbouring weeks, the open day going with the week it belongs to', async () => {
    givenSemaineSemee(new SemaineISO(2026, 20));
    routeFixture.demandeBrute({ annee: '2026', semaine: '20', jour: '2026-05-13' });

    await whenEcranAffiche();

    expect([cibleDuLien('synthese-semaine-precedente', 0), cibleDuLien('synthese-semaine-suivante', 0)]).toEqual([
      { annee: '2026', semaine: '19' },
      { annee: '2026', semaine: '21' },
    ]);
  });

  it('should place the clockings of an element on its row in the open day, at their instant, and nowhere else', async () => {
    givenReleve(
      releveFixture(
        SEMAINE_EN_COURS,
        {
          0: {
            intervalles: [{ debut: [8, 0], fin: [14, 0] }],
            pointagesDElement: [
              { type: 'DEBUT', heure: [8, 0] },
              { type: 'NON_CONFORMITE', heure: [12, 0] },
              { type: 'FIN', heure: [14, 0] },
            ],
          },
          1: { pointagesDElement: [{ type: 'DEBUT', heure: [9, 0] }] },
        },
        {},
        [elementFixture()],
      ),
    );
    routeFixture.demandeBrute({ annee: '2026', semaine: '38', jour: '2026-09-14' });

    await whenEcranAffiche();

    expect(marquesDuJourOuvert()).toEqual(['Début 08:00', 'Non-conformité 12:00', 'Fin 14:00']);
  });

  it('should keep a marker for a clocking that no bar surrounds, since the row of its element has to show it', async () => {
    givenReleve(releveFixture(SEMAINE_EN_COURS, { 0: { pointagesDElement: [{ type: 'FIN', heure: [17, 45] }] } }, {}, [elementFixture()]));
    routeFixture.demandeBrute({ annee: '2026', semaine: '38', jour: '2026-09-14' });

    await whenEcranAffiche();

    expect([nombreDe('synthese-marque'), barresDe('travail').length]).toEqual([1, 0]);
  });

  it('should list in the journal a clocking that no bar surrounds, under the name of its element', async () => {
    givenReleve(releveFixture(SEMAINE_EN_COURS, { 0: { pointagesDElement: [{ type: 'FIN', heure: [17, 45] }] } }, {}, [elementFixture()]));
    routeFixture.demandeBrute({ annee: '2026', semaine: '38', jour: '2026-09-14' });

    await whenEcranAffiche();

    expect(entreesDuJournal()).toEqual([['17:45', 'Fin', 'Moule PRD-2026-000015', '']]);
  });

  it('should put the marker of a clocking on the row of the workstation it names when the element is split', async () => {
    givenReleve(
      releveFixture(
        SEMAINE_EN_COURS,
        {
          0: {
            intervalles: [
              { poste: 'poste-0', debut: [8, 0], fin: [12, 0] },
              { poste: 'poste-1', debut: [10, 0], fin: [14, 0] },
            ],
            pointagesDElement: [
              { type: 'DEBUT', heure: [8, 0], poste: 'poste-0' },
              { type: 'DEBUT', heure: [10, 0], poste: 'poste-1' },
              { type: 'FIN', heure: [14, 0], poste: 'poste-1' },
            ],
          },
        },
        {},
        [
          elementFixture({
            postes: [
              ['DMU 50', 'Fraisage'],
              ['Mazak QT-200', 'Tournage'],
            ],
          }),
        ],
      ),
    );
    routeFixture.demandeBrute({ annee: '2026', semaine: '38', jour: '2026-09-14' });

    await whenEcranAffiche();

    expect(marquesParSousLigne()).toEqual([1, 2]);
  });

  it('should keep on a row said to have no workstation the marker of a clocking that names none when the element is split', async () => {
    givenReleve(
      releveFixture(
        SEMAINE_EN_COURS,
        {
          0: {
            intervalles: [
              { poste: 'poste-0', debut: [8, 0], fin: [12, 0] },
              { poste: 'poste-1', debut: [10, 0], fin: [14, 0] },
            ],
            pointagesDElement: [{ type: 'NON_CONFORMITE', heure: [11, 0] }],
          },
        },
        {},
        [
          elementFixture({
            postes: [
              ['DMU 50', 'Fraisage'],
              ['Mazak QT-200', 'Tournage'],
            ],
          }),
        ],
      ),
    );
    routeFixture.demandeBrute({ annee: '2026', semaine: '38', jour: '2026-09-14' });

    await whenEcranAffiche();

    expect([textes('synthese-sous-ligne-poste'), marquesParSousLigne()]).toEqual([
      ['DMU 50', 'Mazak QT-200', 'Sans poste'],
      [0, 0, 1],
    ]);
  });

  it.each([
    ['2026-09-14', 'without a detailed activity axis when empty', []],
    ['2026-09-15', 'every third hour on the whole day', ['0 h', '3 h', '6 h', '9 h', '12 h', '15 h', '18 h', '21 h', '24 h']],
  ])('should mark the open day %s %s', async (jour, _cas, attendu) => {
    givenReleve(
      releveFixture(SEMAINE_EN_COURS, {
        1: { intervalles: [{ debut: [0, 0], fin: [3, 0] }] },
      }),
    );
    routeFixture.demandeBrute({ annee: '2026', semaine: '38', jour });

    await whenEcranAffiche();

    expect(reperesDuJour(jour === '2026-09-14' ? 0 : 1)).toEqual(['0 h', '24 h']);
    expect(reperesDetail()).toEqual(attendu);
  });

  it('should keep the order the server gave the clockings in, without sorting them by hour', async () => {
    givenReleve(
      releveFixture(SEMAINE_EN_COURS, {
        0: {
          journal: [
            { type: 'DEBUT', heure: [9, 0] },
            { type: 'FIN', heure: [8, 0] },
          ],
        },
      }),
    );
    routeFixture.demandeBrute({ annee: '2026', semaine: '38', jour: '2026-09-14' });

    await whenEcranAffiche();

    expect(entreesDuJournal().map(entree => entree[1])).toEqual(['Début', 'Fin']);
  });

  it('should leave the workstation of a clocking empty when the clocking names none', async () => {
    givenReleve(
      releveFixture(SEMAINE_EN_COURS, { 0: { pointagesDElement: [{ type: 'DEBUT', heure: [7, 5] }] } }, {}, [
        elementFixture({ reference: '1015', postes: [['DMU 50', 'Fraisage']] }),
      ]),
    );
    routeFixture.demandeBrute({ annee: '2026', semaine: '38', jour: '2026-09-14' });

    await whenEcranAffiche();

    expect(entreesDuJournal()).toEqual([['07:05', 'Début', 'Moule 1015', '']]);
  });

  it('should title the journal with the day and the number of its clockings', async () => {
    givenReleve(
      releveFixture(SEMAINE_EN_COURS, {
        0: {
          pointagesDElement: [
            { type: 'DEBUT', heure: [7, 0] },
            { type: 'FIN', heure: [16, 0] },
          ],
        },
      }),
    );
    routeFixture.demandeBrute({ annee: '2026', semaine: '38', jour: '2026-09-14' });

    await whenEcranAffiche();

    expect(texte('synthese-journal-titre')).toBe('Pointages du lundi 14 septembre · 2');
  });

  it('should state an empty open day as without clocking, in place of the journal', async () => {
    givenReleve(releveFixture(SEMAINE_EN_COURS, { 0: { pointagesDElement: [{ type: 'DEBUT', heure: [7, 0] }] } }));
    routeFixture.demandeBrute({ annee: '2026', semaine: '38', jour: '2026-09-15' });

    await whenEcranAffiche();

    expect([texte('synthese-journal-vide'), nombreDe('synthese-journal-entree')]).toEqual(['Aucun pointage ce jour', 0]);
  });

  it('should situate a chosen clocking of the journal by a guide at its instant, across the frise', async () => {
    givenReleve(
      releveFixture(SEMAINE_EN_COURS, {
        0: {
          pointagesDElement: [
            { type: 'DEBUT', heure: [8, 0] },
            { type: 'FIN', heure: [16, 0] },
          ],
        },
      }),
    );
    routeFixture.demandeBrute({ annee: '2026', semaine: '38', jour: '2026-09-14' });
    await whenEcranAffiche();

    await whenEntreeDuJournalChoisie(1);

    expect([entreesPressees(), titres('synthese-repere-selection')]).toEqual([['16:00'], ['Fin 16:00']]);
  });

  it('should let go of a clocking chosen again, guide included', async () => {
    givenReleve(releveFixture(SEMAINE_EN_COURS, { 0: { pointagesDElement: [{ type: 'DEBUT', heure: [8, 0] }] } }));
    routeFixture.demandeBrute({ annee: '2026', semaine: '38', jour: '2026-09-14' });
    await whenEcranAffiche();
    await whenEntreeDuJournalChoisie(0);

    await whenEntreeDuJournalChoisie(0);

    expect([entreesPressees(), nombreDe('synthese-repere-selection')]).toEqual([[], 0]);
  });

  it('should choose no clocking when another day is opened', async () => {
    givenReleve(
      releveFixture(SEMAINE_EN_COURS, {
        0: { pointagesDElement: [{ type: 'DEBUT', heure: [8, 0] }] },
        1: { pointagesDElement: [{ type: 'DEBUT', heure: [9, 0] }] },
      }),
    );
    routeFixture.demandeBrute({ annee: '2026', semaine: '38', jour: '2026-09-14' });
    await whenEcranAffiche();
    await whenEntreeDuJournalChoisie(0);

    await whenAnotherDayIsOpened('2026-09-15');

    expect([entreesPressees(), nombreDe('synthese-repere-selection')]).toEqual([[], 0]);
  });

  it('should choose no clocking when another week is opened', async () => {
    givenReleve(releveFixture(SEMAINE_EN_COURS, { 0: { pointagesDElement: [{ type: 'DEBUT', heure: [8, 0] }] } }));
    const precedente = new SemaineISO(2026, 37);
    givenReleveDe(precedente, releveFixture(precedente, { 0: { pointagesDElement: [{ type: 'DEBUT', heure: [9, 0] }] } }));
    routeFixture.demandeBrute({ annee: '2026', semaine: '38', jour: '2026-09-14' });
    await whenEcranAffiche();
    await whenEntreeDuJournalChoisie(0);

    await whenAnotherWeekIsOpened({ annee: '2026', semaine: '37', jour: '2026-09-07' });

    expect([entreesDuJournal(), entreesPressees()]).toEqual([[['09:00', 'Début', 'Moule PRD-2026-000015', '']], []]);
  });

  it('should choose no clocking at the opening of a day', async () => {
    givenReleve(releveFixture(SEMAINE_EN_COURS, { 0: { pointagesDElement: [{ type: 'DEBUT', heure: [8, 0] }] } }));
    routeFixture.demandeBrute({ annee: '2026', semaine: '38', jour: '2026-09-14' });

    await whenEcranAffiche();

    expect([entreesPressees(), nombreDe('synthese-repere-selection')]).toEqual([[], 0]);
  });

  it('should ring the marker of a chosen clocking of an element, and no other', async () => {
    givenReleve(
      releveFixture(
        SEMAINE_EN_COURS,
        {
          0: {
            pointagesDElement: [
              { type: 'DEBUT', heure: [8, 0] },
              { type: 'FIN', heure: [14, 0] },
            ],
          },
        },
        {},
        [elementFixture()],
      ),
    );
    routeFixture.demandeBrute({ annee: '2026', semaine: '38', jour: '2026-09-14' });
    await whenEcranAffiche();

    await whenEntreeDuJournalChoisie(1);

    expect(marquesChoisies()).toEqual(['Fin 14:00']);
  });

  it.each([
    ['an isolated clocking of an element', { pointagesDElement: [{ type: 'FIN', heure: [5, 30] }] }],
    ['a raw end no interval surrounds', { pointagesDElement: [{ type: 'FIN', heure: [22, 45] }] }],
  ] as const)('should open the axis of the open day onto the whole day for %s outside the daytime hours', async (_cas, jour) => {
    givenReleve(releveFixture(SEMAINE_EN_COURS, { 0: jour }, {}, [elementFixture()]));
    routeFixture.demandeBrute({ annee: '2026', semaine: '38', jour: '2026-09-14' });

    await whenEcranAffiche();

    expect([reperesDuJour(0)[0], reperesDuJour(0).at(-1)]).toEqual(['0 h', '24 h']);
  });

  it('should keep the daytime axis of a closed day whose clocking, not drawn, lies outside the daytime hours', async () => {
    givenReleve(releveFixture(SEMAINE_EN_COURS, { 0: { pointagesDElement: [{ type: 'FIN', heure: [5, 30] }] } }, {}, [elementFixture()]));
    routeFixture.demandeBrute({ annee: '2026', semaine: '38', jour: '2026-09-15' });

    await whenEcranAffiche();

    expect(reperesDuJour(0)).toEqual(['0 h', '24 h']);
  });

  it('should not read the report again when another day of the same week is opened', async () => {
    givenSemaineSemee(new SemaineISO(2026, 38));
    routeFixture.demandeBrute({ annee: '2026', semaine: '38', jour: '2026-09-14' });
    await whenEcranAffiche();

    await whenAnotherDayIsOpened('2026-09-15');

    expect(portFixture.demandes).toHaveLength(1);
  });

  it('should mark the column of today', async () => {
    givenSemaineSemee(new SemaineISO(2026, 38));

    await whenEcranAffiche();

    expect(jourMarqueAujourdhui()).toBe('jeu. 17');
  });

  it('should explain in its legend every kind of bar, marker and line the frise draws, and nothing else', async () => {
    givenReleve(
      releveFixture(
        SEMAINE_EN_COURS,
        {
          0: {
            journal: [
              { type: 'DEBUT', heure: [8, 0] },
              { type: 'DEBUT', heure: [8, 0], poste: 'poste-0' },
              { type: 'NON_CONFORMITE', heure: [12, 0], poste: 'poste-0' },
              { type: 'FIN', heure: [14, 0], poste: 'poste-0' },
              { type: 'FIN', heure: [16, 0] },
            ],
            intervalles: [
              { poste: 'poste-0', debut: [8, 0], fin: [12, 0] },
              { poste: 'poste-0', categorie: 'NON_CONFORMITE', debut: [12, 0], fin: [14, 0] },
              { element: 'element-2', debut: [9, 0], fin: [16, 0] },
            ],
          },
          1: {
            pointagesDElement: [{ type: 'DEBUT', heure: [10, 20] }],
            intervalles: [{ debut: [10, 20], fin: [15, 40] }],
          },
          2: {
            pointagesDElement: [{ type: 'DEBUT', heure: [8, 0] }],
            intervalles: [{ debut: [8, 0] }],
          },
        },
        {},
        [elementFixture({ postes: [['DMU 50', 'Fraisage']] }), elementFixture({ id: 'element-2' })],
      ),
    );
    routeFixture.demandeBrute({ annee: '2026', semaine: '38', jour: '2026-09-14' });

    await whenEcranAffiche();

    expect(legendesDessinees()).toEqual(legendesExpliquees());
  });

  it('should display the loading status until the report arrives', () => {
    givenLectureSuspendue();

    whenEcranMonte();

    expect(texte('synthese-loading')).toBe('Chargement du temps opérationnel…');
  });

  it('should name the week of a report spanning two years', async () => {
    givenSemaineSemee(new SemaineISO(2026, 1));
    routeFixture.demande('2026', '1');

    await whenEcranAffiche();

    expect(texte('synthese-semaine-libelle')).toBe('Semaine 1 · 29 déc. 2025 – 4 janv. 2026');
  });

  it('should offer the year in progress and the five before it', async () => {
    givenSemaineSemee(new SemaineISO(2026, 38));

    await whenEcranAffiche();

    expect(optionsDe('synthese-annee')).toEqual(['2026', '2025', '2024', '2023', '2022', '2021']);
  });

  it.each([
    ['synthese-annee', '2026'],
    ['synthese-semaine', '38'],
  ])('should show %s selected on the week in progress', async (selector, attendu) => {
    givenSemaineSemee(new SemaineISO(2026, 38));

    await whenEcranAffiche();

    expect(valeurChoisie(selector)).toBe(attendu);
  });

  it('should stop the weeks it offers at the week in progress', async () => {
    givenSemaineSemee(new SemaineISO(2026, 38));

    await whenEcranAffiche();

    expect(optionsDe('synthese-semaine')).toHaveLength(38);
  });

  it('should offer the fifty-three weeks of a long past year', async () => {
    givenSemaineSemee(new SemaineISO(2020, 10));
    routeFixture.demande('2020', '10');

    await whenEcranAffiche();

    expect(optionsDe('synthese-semaine')).toHaveLength(53);
  });

  it('should offer the fifty-two weeks of a short past year', async () => {
    givenSemaineSemee(new SemaineISO(2025, 10));
    routeFixture.demande('2025', '10');

    await whenEcranAffiche();

    expect(optionsDe('synthese-semaine')).toHaveLength(52);
  });

  it('should ask for another week when one is chosen', async () => {
    givenSemaineSemee(new SemaineISO(2026, 38));
    await whenEcranAffiche();

    await whenSemaineChoisie('12');

    expect(routerFixture.navigations).toEqual([{ annee: 2026, semaine: 12 }]);
  });

  it('should ask for the same week of another year when that year is chosen', async () => {
    givenSemaineSemee(new SemaineISO(2026, 20));
    routeFixture.demande('2026', '20');
    await whenEcranAffiche();

    await whenAnneeChoisie('2025');

    expect(routerFixture.navigations).toEqual([{ annee: 2025, semaine: 20 }]);
  });

  it('should fall back to the last week of a year that is shorter than the week in progress', async () => {
    givenSemaineSemee(new SemaineISO(2026, 38));
    await whenEcranAffiche();

    await whenAnneeChoisie('2025');

    expect(routerFixture.navigations).toEqual([{ annee: 2025, semaine: 38 }]);
  });

  it('should offer an earlier week on week one, which belongs to the previous year', async () => {
    givenSemaineSemee(new SemaineISO(2026, 1));
    routeFixture.demande('2026', '1');

    await whenEcranAffiche();

    expect(present('synthese-semaine-precedente')).toBe(true);
  });

  it('should offer a later week on a past week', async () => {
    givenSemaineSemee(new SemaineISO(2026, 20));
    routeFixture.demande('2026', '20');

    await whenEcranAffiche();

    expect(present('synthese-semaine-suivante')).toBe(true);
  });

  it('should offer no earlier week at the first week the calendar serves', async () => {
    givenSemaineSemee(new SemaineISO(2000, 1));
    routeFixture.demande('2000', '1');

    await whenEcranAffiche();

    expect(present('synthese-semaine-precedente')).toBe(false);
  });

  it('should offer no later week on the week in progress', async () => {
    givenSemaineSemee(new SemaineISO(2026, 38));

    await whenEcranAffiche();

    expect(present('synthese-semaine-suivante')).toBe(false);
  });

  it.each([
    [{ annee: '2025', semaine: '53' }],
    [{ annee: '1999', semaine: '1' }],
    [{ annee: 'abc', semaine: '38' }],
    [{ annee: '2026' }],
    [{ semaine: '38' }],
  ])('should refuse the week named by %o and ask the server for nothing', async parametres => {
    routeFixture.demandeBrute(parametres);

    await whenEcranAffiche();

    expect(texte('synthese-adresse-invalide')).toContain('ne désigne pas une semaine ou un jour que le calendrier porte');
    expect(portFixture.demandes).toEqual([]);
  });

  it.each([
    [{ annee: '2026', semaine: '38', jour: '2026-09-21' }],
    [{ jour: '2026-09-21' }],
    [{ annee: '2026', semaine: '38', jour: 'abc' }],
    [{ annee: '2026', semaine: '38', jour: '' }],
  ])('should refuse the day named by %o, out of the week or unreadable, and ask the server for nothing', async parametres => {
    routeFixture.demandeBrute(parametres);

    await whenEcranAffiche();

    expect([present('synthese-adresse-invalide'), portFixture.demandes]).toEqual([true, []]);
  });

  it('should refuse an address naming no operator and ask the server for nothing', async () => {
    givenAdresseSansOperateur();

    await whenEcranAffiche();

    expect(texte('synthese-adresse-invalide')).toContain('ne désigne pas une semaine ou un jour que le calendrier porte');
    expect(portFixture.demandes).toEqual([]);
  });

  it('should explain that the referential does not know this operator', async () => {
    givenOperateurInconnu();

    await whenEcranAffiche();

    expect(texte('synthese-operateur-introuvable')).toContain('n’existe plus au référentiel');
  });

  it('should display an error when the report cannot be read', async () => {
    givenLectureEnEchec();

    await whenEcranAffiche();

    expect(texte('synthese-error')).toContain('Impossible de charger le temps opérationnel de la semaine.');
  });

  it('should read the report again when the retry is used', async () => {
    givenLectureEnEchec();
    await whenEcranAffiche();

    await whenRepriseDemandee();

    expect(portFixture.demandes).toHaveLength(2);
  });

  it('should ask the server for the operator the URL names', async () => {
    givenSemaineSemee(new SemaineISO(2026, 38));

    await whenEcranAffiche();

    expect(portFixture.demandes.map(demande => demande.operateur.value)).toEqual([OPERATEUR]);
  });

  it('should keep the current week when an obsolete successful reading answers later', async () => {
    const reprise = givenReadingInFlight(releveFixture(SEMAINE_EN_COURS, {}, { operationnelle: 'PT99H' }));
    givenReleveDe(new SemaineISO(2026, 37), releveFixture(new SemaineISO(2026, 37), {}, { operationnelle: 'PT2H' }));

    await whenReadingStarts();
    await whenAnotherWeekReplacesThePendingReading();
    await whenObsoleteReadingAnswers(reprise);

    expect(texte('synthese-semaine-libelle')).toContain('Semaine 37');
    expect(texte('synthese-operationnel-total')).toBe('2 h 00');
    expect(portFixture.demandes.map(demande => demande.semaine.numero)).toEqual([38, 37]);
  });

  it('should name an opening fact in a conflict without a workstation', async () => {
    const conflit = new SequenceEnConflit(
      new CibleDePointage(new ElementReleveId('element-1'), undefined),
      [new ActiviteReleveId('a')],
      [new PointageReleveId('a')],
    );
    givenReleve(
      releveFixture(
        SEMAINE_EN_COURS,
        { 0: { pointagesDElement: [{ id: 'a', type: 'DEBUT', heure: [8, 0] }] } },
        {},
        [elementFixture({ reference: '1015' })],
        [conflit],
      ),
    );

    await whenEcranAffiche();

    expect(textes('synthese-conflit-element')).toEqual(['Moule 1015']);
    expect(textes('synthese-conflit-fait')).toEqual(['Début 08:00 · Ouverture · a']);
  });

  it('should replace the conflict and incomplete total with the corrected report received on a new reading', async () => {
    const conflit = new SequenceEnConflit(
      new CibleDePointage(new ElementReleveId('element-1'), undefined),
      [new ActiviteReleveId('a')],
      [new PointageReleveId('a')],
    );
    givenReleve(
      releveFixture(
        SEMAINE_EN_COURS,
        {
          0: {
            operationnelle: false,
            intervalles: [
              {
                debut: [8, 0],
                activite: {
                  id: new ActiviteReleveId('a'),
                  debut: instantFixture(0, [8, 0]),
                  etat: 'A_RESOUDRE',
                  finAuPlusTard: undefined,
                },
              },
            ],
            pointagesDElement: [{ id: 'a', type: 'DEBUT', heure: [8, 0] }],
          },
        },
        { operationnelle: false },
        [elementFixture({ duree: false })],
        [conflit],
      ),
    );
    givenSemaineSemee(new SemaineISO(2026, 37));

    await whenEcranAffiche();
    const avant = [texte('synthese-operationnel-total'), present('synthese-conflits-titre')];
    givenReleve(
      releveFixture(
        SEMAINE_EN_COURS,
        {
          0: {
            operationnelle: 'PT2H',
            intervalles: [
              {
                debut: [8, 0],
                fin: [10, 0],
                activite: {
                  id: new ActiviteReleveId('a'),
                  debut: instantFixture(0, [8, 0]),
                  fin: instantFixture(0, [10, 0]),
                  etat: 'TERMINEE',
                },
              },
            ],
          },
        },
        { operationnelle: 'PT2H' },
        [elementFixture({ duree: 'PT2H' })],
      ),
    );
    await whenAnotherWeekIsOpened({ annee: '2026', semaine: '37', jour: '2026-09-08' });
    await whenAnotherWeekIsOpened({ annee: '2026', semaine: '38', jour: '2026-09-14' });

    expect([avant, texte('synthese-operationnel-total'), present('synthese-conflits-titre'), textes('synthese-activite-etat')]).toEqual([
      ['Incomplet', true],
      '2 h 00',
      false,
      [],
    ]);
    expect(portFixture.demandes.map(demande => demande.semaine.numero)).toEqual([38, 37, 38]);
  });

  const givenReadingInFlight = (releve: ReleveDesHeures): (() => void) => {
    let reprise = (): void => undefined;
    portFixture.lectureDifferee = new Promise(resolve => {
      reprise = () => {
        resolve(releve);
      };
    });
    return reprise;
  };

  const whenReadingStarts = async (): Promise<void> => {
    const entree = new Promise<void>(resolve => {
      portFixture.lectureEntree = resolve;
    });
    whenEcranMonte();
    await entree;
    portFixture.lectureEntree = undefined;
  };

  const whenAnotherWeekReplacesThePendingReading = async (): Promise<void> => {
    portFixture.lectureDifferee = undefined;
    await whenAnotherWeekIsOpened({ annee: '2026', semaine: '37', jour: '2026-09-08' });
  };

  const whenObsoleteReadingAnswers = async (reprise: () => void): Promise<void> => {
    reprise();
    await componentFixture.whenStable();
  };

  const givenReleveDe = (semaine: SemaineISO, releve: ReleveDesHeures): void => {
    portFixture.releves.set(`${OPERATEUR}|${String(semaine.annee)}|${String(semaine.numero)}`, releve);
  };

  const givenReleve = (releve: ReleveDesHeures): void => {
    givenReleveDe(SEMAINE_EN_COURS, releve);
  };

  const givenSemaineSemee = (semaine: SemaineISO): void => {
    givenReleveDe(semaine, releveFixture(semaine, { 0: jourTravailleFixture }));
  };

  const givenOperateurInconnu = (): void => {
    portFixture.operateursInconnus.add(OPERATEUR);
  };

  const givenAdresseSansOperateur = (): void => {
    routeFixture.paramMap.next(convertToParamMap({}));
  };

  const givenLectureEnEchec = (): void => {
    portFixture.lectureFailure = new Error('panne');
  };

  const givenLectureSuspendue = (): void => {
    portFixture.lectureDifferee = new Promise(() => undefined);
  };

  const whenEcranMonte = (): void => {
    componentFixture = TestBed.createComponent(SyntheseDesHeures);
    componentFixture.detectChanges();
  };

  const whenEcranAffiche = async (): Promise<void> => {
    whenEcranMonte();
    await componentFixture.whenStable();
  };

  const whenEntreeDuJournalChoisie = async (rang: number): Promise<void> => {
    [...racine().querySelectorAll<HTMLElement>(dataSelector('synthese-journal-entree'))][rang]?.click();
    await componentFixture.whenStable();
  };

  const whenAnotherWeekIsOpened = async (adresse: { annee: string; semaine: string; jour: string }): Promise<void> => {
    routeFixture.demandeBrute(adresse);
    await componentFixture.whenStable();
  };

  const whenAnotherDayIsOpened = (jour: string): Promise<void> => whenAnotherWeekIsOpened({ annee: '2026', semaine: '38', jour });

  const whenSemaineChoisie = async (numero: string): Promise<void> => {
    const select = selectRequis('synthese-semaine');
    select.value = numero;
    select.dispatchEvent(new Event('change'));
    await componentFixture.whenStable();
  };

  const whenAnneeChoisie = async (annee: string): Promise<void> => {
    const select = selectRequis('synthese-annee');
    select.value = annee;
    select.dispatchEvent(new Event('change'));
    await componentFixture.whenStable();
  };

  const whenRepriseDemandee = async (): Promise<void> => {
    requis('synthese-retry').click();
    await componentFixture.whenStable();
  };

  const racine = (): HTMLElement => componentFixture.nativeElement as HTMLElement;

  const requis = (selector: string): HTMLElement => {
    const element = racine().querySelector<HTMLElement>(dataSelector(selector));
    if (element === null) {
      throw new Error(`Aucun élément ${selector} à l’écran`);
    }
    return element;
  };

  const selectRequis = (selector: string): HTMLSelectElement => {
    const element = racine().querySelector<HTMLSelectElement>(dataSelector(selector));
    if (element === null) {
      throw new Error(`Aucun sélecteur ${selector} à l’écran`);
    }
    return element;
  };

  const normalise = (valeur: string): string => valeur.replace(/[\u00a0\u2009\u202f]/g, ' ').trim();

  const texte = (selector: string): string => normalise(requis(selector).textContent);

  const textes = (selector: string): string[] =>
    [...racine().querySelectorAll<HTMLElement>(dataSelector(selector))].map(element => normalise(element.textContent));

  const present = (selector: string): boolean => racine().querySelector(dataSelector(selector)) !== null;

  const nombreDe = (selector: string): number => racine().querySelectorAll(dataSelector(selector)).length;

  const jourMarqueAujourdhui = (): string =>
    normalise(
      requis('synthese-aujourdhui').closest(dataSelector('synthese-jour-cell'))?.querySelector(dataSelector('synthese-jour'))?.textContent
        ?? '',
    );

  const titres = (selector: string): string[] =>
    [...racine().querySelectorAll<HTMLElement>(dataSelector(selector))].map(element => element.getAttribute('title') ?? '');

  const LEGENDE_D_UN_MARQUEUR: Record<string, string> = { debut: 'debut', nc: 'non-conformite-pointee', fin: 'fin' };

  const LEGENDE_D_UNE_BARRE: Record<string, string> = { travail: 'travail', nc: 'non-conformite', 'en-cours': 'en-cours' };

  const legendesDessinees = (): string[] =>
    [
      ...new Set([
        ...[...racine().querySelectorAll<HTMLElement>(dataSelector('synthese-barre'))].map(
          barre => LEGENDE_D_UNE_BARRE[barre.dataset['style'] ?? ''] ?? '',
        ),
        ...[...racine().querySelectorAll<HTMLElement>(dataSelector('synthese-marque'))].map(
          marque => LEGENDE_D_UN_MARQUEUR[marque.dataset['type'] ?? ''] ?? '',
        ),
      ]),
    ].sort((un, autre) => un.localeCompare(autre));

  const legendesExpliquees = (): string[] =>
    [...racine().querySelectorAll<HTMLElement>(dataSelector('synthese-legende'))]
      .map(entree => entree.dataset['legende'] ?? '')
      .sort((un, autre) => un.localeCompare(autre));

  const barresDe = (style: string): HTMLElement[] =>
    [...racine().querySelectorAll<HTMLElement>(dataSelector('synthese-barre'))].filter(barre => barre.dataset['style'] === style);

  const textesDe = (elements: readonly HTMLElement[]): string[] => elements.map(element => normalise(element.textContent));

  const titresDe = (elements: readonly HTMLElement[]): string[] => elements.map(element => element.getAttribute('title') ?? '');

  const barresParJour = (): number[] =>
    [...racine().querySelectorAll<HTMLElement>(dataSelector('synthese-element-jour'))].map(
      cellule => cellule.querySelectorAll(dataSelector('synthese-barre')).length,
    );

  const joursOuverts = (): string[] =>
    [...racine().querySelectorAll<HTMLElement>(dataSelector('synthese-jour-lien'))]
      .filter(lien => lien.getAttribute('aria-current') === 'true')
      .map(lien => normalise(lien.querySelector(dataSelector('synthese-jour'))?.textContent ?? ''));

  const cibleDuLien = (selector: string, rang: number): Record<string, string> => {
    const href = [...racine().querySelectorAll<HTMLElement>(dataSelector(selector))][rang]?.getAttribute('href') ?? '';
    return Object.fromEntries(new URL(href, 'http://glm.test').searchParams);
  };

  const entreesPressees = (): string[] =>
    [...racine().querySelectorAll<HTMLElement>(dataSelector('synthese-journal-entree'))]
      .filter(entree => entree.getAttribute('aria-pressed') === 'true')
      .map(entree => normalise(entree.querySelector(dataSelector('synthese-journal-heure'))?.textContent ?? ''));

  const entreesDuJournal = (): string[][] =>
    [...racine().querySelectorAll<HTMLElement>(dataSelector('synthese-journal-entree'))].map(entree =>
      ['heure', 'pointage', 'objet', 'poste'].map(colonne =>
        normalise(entree.querySelector(dataSelector(`synthese-journal-${colonne}`))?.textContent ?? ''),
      ),
    );

  const marquesChoisies = (): string[] =>
    [...racine().querySelectorAll<HTMLElement>(dataSelector('synthese-marque'))]
      .filter(marque => marque.dataset['choisie'] === 'true')
      .map(marque => marque.getAttribute('title') ?? '');

  const marquesDuJourOuvert = (): string[] =>
    [...racine().querySelectorAll<HTMLElement>(dataSelector('synthese-marque'))].map(marque => marque.getAttribute('title') ?? '');

  const marquesParSousLigne = (): number[] =>
    [...racine().querySelectorAll<HTMLElement>(dataSelector('synthese-sous-ligne'))].map(
      sousLigne => sousLigne.querySelectorAll(dataSelector('synthese-marque')).length,
    );

  const reperesDetail = (): string[] =>
    [...racine().querySelectorAll<HTMLElement>(dataSelector('synthese-detail-repere'))].map(repere => normalise(repere.textContent));

  const reperesDuJour = (rang: number): string[] => {
    const entete = [...racine().querySelectorAll<HTMLElement>(dataSelector('synthese-jour-cell'))][rang];
    return [...(entete?.querySelectorAll<HTMLElement>(dataSelector('synthese-repere')) ?? [])].map(repere => normalise(repere.textContent));
  };

  const barresParSousLigne = (): number[][] =>
    [...racine().querySelectorAll<HTMLElement>(dataSelector('synthese-sous-ligne'))].map(sousLigne =>
      [...sousLigne.querySelectorAll<HTMLElement>(dataSelector('synthese-sous-ligne-jour'))].map(
        cellule => cellule.querySelectorAll(dataSelector('synthese-barre')).length,
      ),
    );

  const valeurChoisie = (selector: string): string => selectRequis(selector).value;

  const optionsDe = (selector: string): string[] => [...selectRequis(selector).options].map(option => option.value);
});
