import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, ParamMap, Router } from '@angular/router';
import { SyntheseDesHeuresFixture } from '@test/unit/fixtures/gestion/releve-des-heures/SyntheseDesHeuresFixture';
import { dataSelector } from '@test/utils/DataSelector';
import { BehaviorSubject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DureeTravaillee } from '../../../domain/duree/DureeTravaillee';
import { IdentiteOperateur } from '../../../domain/releve/IdentiteOperateur';
import { InstantDeReleve } from '../../../domain/releve/InstantDeReleve';
import { JourDeReleve } from '../../../domain/releve/JourDeReleve';
import { PlageDeReleve } from '../../../domain/releve/PlageDeReleve';
import { PointageDeReleve } from '../../../domain/releve/PointageDeReleve';
import { ReleveDesHeures } from '../../../domain/releve/ReleveDesHeures';
import { SyntheseDesHeuresPort } from '../../../domain/releve/SyntheseDesHeuresPort';
import { TypeDePointage } from '../../../domain/releve/TypeDePointage';
import { JourCalendaire } from '../../../domain/semaine/JourCalendaire';
import { SemaineISO } from '../../../domain/semaine/SemaineISO';
import { SyntheseDesHeures } from './SyntheseDesHeures';

const OPERATEUR = 'op-1';
const SEMAINE_EN_COURS = new SemaineISO(2026, 38);

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

class RouterFixture {
  readonly navigations: Record<string, number>[] = [];

  navigate(_commands: unknown[], extras?: { queryParams?: Record<string, number> }): Promise<boolean> {
    this.navigations.push(extras?.queryParams ?? {});
    return Promise.resolve(true);
  }
}

type Heure = readonly [number, number];

const instantFixture = (rang: number, [heure, minute]: Heure): InstantDeReleve =>
  new InstantDeReleve(new Date(2026, 8, 14 + rang, heure, minute).toISOString());

interface JourFixture {
  readonly pointee?: string;
  readonly presumee?: string;
  readonly pointages?: readonly (readonly [TypeDePointage, Heure])[];
  readonly plages?: readonly (readonly [Heure, Heure | undefined, boolean?])[];
}

const jourFixture = (jour: JourCalendaire, rang: number, fiche: JourFixture): JourDeReleve =>
  new JourDeReleve({
    jour,
    dureePointee: new DureeTravaillee(fiche.pointee ?? 'PT0S'),
    dureePresumee: new DureeTravaillee(fiche.presumee ?? 'PT0S'),
    pointages: (fiche.pointages ?? []).map(([type, heure]) => new PointageDeReleve(type, instantFixture(rang, heure))),
    plages: (fiche.plages ?? []).map(
      ([debut, fin, presumee]) =>
        new PlageDeReleve(instantFixture(rang, debut), fin === undefined ? undefined : instantFixture(rang, fin), presumee ?? false),
    ),
  });

const releveFixture = (semaine: SemaineISO, jours: Readonly<Record<number, JourFixture>>, totalPresume = 'PT0S'): ReleveDesHeures =>
  new ReleveDesHeures(semaine, {
    operateur: new IdentiteOperateur('Dupont', 'Jean'),
    totalPointe: new DureeTravaillee('PT7H30M'),
    totalPresume: new DureeTravaillee(totalPresume),
    jours: semaine.jours().map((jour, rang) => jourFixture(jour, rang, jours[rang] ?? {})),
  });

const jourTravailleFixture: JourFixture = {
  pointee: 'PT7H30M',
  pointages: [
    ['ARRIVEE', [8, 2]],
    ['DEPART', [12, 0]],
    ['ARRIVEE', [13, 0]],
    ['DEPART', [17, 32]],
  ],
  plages: [
    [
      [8, 2],
      [12, 0],
    ],
    [
      [13, 0],
      [17, 32],
    ],
  ],
};

const jourAbandonneFixture: JourFixture = {
  presumee: 'PT5H20M',
  pointages: [['ARRIVEE', [10, 20]]],
  plages: [[[10, 20], [15, 40], true]],
};

const jourDeDureeNulleFixture: JourFixture = {
  pointages: [
    ['ARRIVEE', [8, 2]],
    ['DEPART', [8, 2]],
  ],
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
      ],
    });
  });

  afterEach(() => {
    componentFixture.destroy();
    vi.useRealTimers();
  });

  it.each([
    ['synthese-semaine-libelle', 'Semaine 38 · 14–20 sept. 2026'],
    ['synthese-identite', 'Jean DUPONT'],
    ['synthese-total', 'Pointé : 7 h 30'],
  ])('should display %s as %s for the week containing today', async (selector, attendu) => {
    givenSemaineSemee(new SemaineISO(2026, 38));

    await whenEcranAffiche();

    expect(texte(selector)).toBe(attendu);
  });

  it('should give each of the seven days its column', async () => {
    givenSemaineSemee(new SemaineISO(2026, 38));

    await whenEcranAffiche();

    expect(textes('synthese-jour')).toEqual(['lun. 14', 'mar. 15', 'mer. 16', 'jeu. 17', 'ven. 18', 'sam. 19', 'dim. 20']);
  });

  it('should head each column with the clocked time of its day', async () => {
    givenSemaineSemee(new SemaineISO(2026, 38));

    await whenEcranAffiche();

    expect(textes('synthese-duree-cell')).toEqual(['7 h 30', '—', '—', '—', '—', '—', '—']);
  });

  it('should add the presumed time of a day under its clocked time', async () => {
    givenReleve(releveFixture(SEMAINE_EN_COURS, { 1: jourAbandonneFixture }, 'PT5H20M'));

    await whenEcranAffiche();

    expect([textes('synthese-duree-cell')[1], textes('synthese-duree-presumee')]).toEqual(['0 h 00', ['+ 5 h 20 présumées']]);
  });

  it.each(['synthese-duree-presumee', 'synthese-total-presume'])(
    'should display no %s for a week without presumed time',
    async selector => {
      givenSemaineSemee(new SemaineISO(2026, 38));

      await whenEcranAffiche();

      expect(present(selector)).toBe(false);
    },
  );

  it('should display the presumed week total, to be confirmed, beside the clocked one', async () => {
    givenReleve(releveFixture(SEMAINE_EN_COURS, { 1: jourAbandonneFixture }, 'PT5H20M'));

    await whenEcranAffiche();

    expect([texte('synthese-total'), texte('synthese-total-presume')]).toEqual(['Pointé : 7 h 30', 'Présumé, à confirmer : 5 h 20']);
  });

  it('should mark the column of today', async () => {
    givenSemaineSemee(new SemaineISO(2026, 38));

    await whenEcranAffiche();

    expect(jourMarqueAujourdhui()).toBe('jeu. 17');
  });

  it('should state the presence of a day in the order of the hours, then its clockings', async () => {
    givenSemaineSemee(new SemaineISO(2026, 38));

    await whenEcranAffiche();

    expect([textes('synthese-enonce'), textes('synthese-pointage')]).toEqual([
      ['Présence 08:02 – 12:00', 'Présence 13:00 – 17:32'],
      ['Arrivée 08:02', 'Départ 12:00', 'Arrivée 13:00', 'Départ 17:32'],
    ]);
  });

  it('should write the hours of a long interval at its top and its bottom', async () => {
    givenSemaineSemee(new SemaineISO(2026, 38));

    await whenEcranAffiche();

    expect([titres('synthese-plage'), textes('synthese-debut'), textes('synthese-fin')]).toEqual([
      ['Présence 08:02 – 12:00', 'Présence 13:00 – 17:32'],
      ['08:02', '13:00'],
      ['12:00', '17:32'],
    ]);
  });

  it('should write the hours of a medium interval on one line', async () => {
    givenReleve(
      releveFixture(SEMAINE_EN_COURS, {
        0: {
          pointages: [
            ['ARRIVEE', [8, 0]],
            ['DEPART', [9, 0]],
          ],
          plages: [
            [
              [8, 0],
              [9, 0],
            ],
          ],
        },
      }),
    );

    await whenEcranAffiche();

    expect(textes('synthese-plage')).toEqual(['08:00 – 09:00']);
  });

  it('should draw a presumed interval apart, its end read as presumed', async () => {
    givenReleve(releveFixture(SEMAINE_EN_COURS, { 1: jourAbandonneFixture }, 'PT5H20M'));

    await whenEcranAffiche();

    expect([titres('synthese-plage-presumee'), textes('synthese-fin'), textes('synthese-enonce')]).toEqual([
      ['Présence présumée 10:20 – 15:40'],
      ['15:40 présumée'],
      ['Présence présumée 10:20 – 15:40'],
    ]);
  });

  it('should keep both halves of a presumed interval cut at midnight presumed, the suffix only on a real end hour', async () => {
    givenReleve(
      releveFixture(
        SEMAINE_EN_COURS,
        {
          0: { presumee: 'PT4H', pointages: [['ARRIVEE', [20, 0]]], plages: [[[20, 0], [24, 0], true]] },
          1: { presumee: 'PT4H', plages: [[[0, 0], [4, 0], true]] },
        },
        'PT8H',
      ),
    );

    await whenEcranAffiche();

    expect([titres('synthese-plage-presumee'), textes('synthese-debut'), textes('synthese-fin')]).toEqual([
      ['Présence présumée depuis 20:00, se poursuit le lendemain', 'Présence présumée depuis la veille jusqu’à 04:00'],
      ['20:00', 'depuis la veille'],
      ['se poursuit', '04:00 présumée'],
    ]);
  });

  it('should draw no break before a departure no interval ends, and keep that departure clocked', async () => {
    givenReleve(releveFixture(SEMAINE_EN_COURS, { 1: { pointages: [['DEPART', [10, 0]]] } }));

    await whenEcranAffiche();

    expect([nombreDe('synthese-pause'), textes('synthese-pointage')]).toEqual([0, ['Départ 10:00']]);
  });

  it('should name short intervals close to one another in one shared note', async () => {
    givenReleve(
      releveFixture(SEMAINE_EN_COURS, {
        3: {
          pointages: [
            ['ARRIVEE', [15, 10]],
            ['DEPART', [15, 10]],
            ['ARRIVEE', [15, 20]],
            ['DEPART', [15, 30]],
          ],
          plages: [
            [
              [15, 10],
              [15, 10],
            ],
            [
              [15, 20],
              [15, 30],
            ],
          ],
        },
      }),
    );

    await whenEcranAffiche();

    expect([nombreDe('synthese-plage'), lignes('synthese-note')]).toEqual([2, ['15:10 – 15:10', '15:20 – 15:30']]);
  });

  it('should mark an interval still in progress by the clocking that opened it rather than invent its end', async () => {
    givenReleve(
      releveFixture(SEMAINE_EN_COURS, {
        3: {
          pointages: [
            ['ARRIVEE', [8, 2]],
            ['DEPART', [10, 0]],
            ['ARRIVEE', [10, 20]],
          ],
          plages: [
            [
              [8, 2],
              [10, 0],
            ],
            [[10, 20], undefined],
          ],
        },
      }),
    );

    await whenEcranAffiche();

    expect([lignes('synthese-plage-ouverte'), titres('synthese-plage-ouverte')]).toEqual([
      ['Arrivée 10:20', 'en cours'],
      ['Présence depuis 10:20, en cours'],
    ]);
  });

  it('should name an interval in progress by the presence when no clocking of the day shares its start', async () => {
    givenReleve(releveFixture(SEMAINE_EN_COURS, { 3: { plages: [[[6, 0], undefined]] } }));

    await whenEcranAffiche();

    expect(lignes('synthese-plage-ouverte')).toEqual(['Présence 06:00', 'en cours']);
  });

  it('should write the continuation of a night shift in place of midnight', async () => {
    givenReleve(
      releveFixture(SEMAINE_EN_COURS, {
        0: {
          pointages: [['ARRIVEE', [19, 0]]],
          plages: [
            [
              [19, 0],
              [24, 0],
            ],
          ],
        },
        1: {
          pointages: [['DEPART', [7, 0]]],
          plages: [
            [
              [0, 0],
              [7, 0],
            ],
          ],
        },
      }),
    );

    await whenEcranAffiche();

    expect([textes('synthese-debut'), textes('synthese-fin')]).toEqual([
      ['19:00', 'depuis la veille'],
      ['se poursuit', '07:00'],
    ]);
  });

  it('should scale the week on the daytime hours', async () => {
    givenSemaineSemee(new SemaineISO(2026, 38));

    await whenEcranAffiche();

    expect(textes('synthese-repere')).toEqual(['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00']);
  });

  it('should display a day carrying neither clocking nor interval as no clocking at all', async () => {
    givenSemaineSemee(new SemaineISO(2026, 38));

    await whenEcranAffiche();

    expect(textes('synthese-jour-sans-pointage')).toEqual(Array(6).fill('Aucun pointage'));
  });

  it('should display a working day of zero duration as zero hours, drawing nothing and stating its clockings', async () => {
    givenReleve(releveFixture(SEMAINE_EN_COURS, { 0: jourDeDureeNulleFixture }));

    await whenEcranAffiche();

    expect([
      textes('synthese-duree-cell')[0],
      nombreDe('synthese-jour-sans-pointage'),
      nombreDe('synthese-plage'),
      textes('synthese-pointage'),
    ]).toEqual(['0 h 00', 6, 0, ['Arrivée 08:02', 'Départ 08:02']]);
  });

  it('should draw a day a presence covers without any clocking rather than call it empty', async () => {
    givenReleve(
      releveFixture(SEMAINE_EN_COURS, {
        0: {
          plages: [
            [
              [0, 0],
              [24, 0],
            ],
          ],
        },
      }),
    );

    await whenEcranAffiche();

    expect([nombreDe('synthese-plage'), nombreDe('synthese-jour-sans-pointage')]).toEqual([1, 6]);
  });

  it('should explain each mark of the agenda in its legend', async () => {
    givenSemaineSemee(new SemaineISO(2026, 38));

    await whenEcranAffiche();

    expect(textes('synthese-legende')).toEqual(['Pointé', 'Présumé (à confirmer)', 'En cours']);
  });

  it('should display the loading status until the report arrives', () => {
    givenLectureSuspendue();

    whenEcranMonte();

    expect(texte('synthese-loading')).toBe('Chargement de la synthèse…');
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

    expect(texte('synthese-adresse-invalide')).toContain('ne désigne pas une semaine que le calendrier porte');
    expect(portFixture.demandes).toEqual([]);
  });

  it('should refuse an address naming no operator and ask the server for nothing', async () => {
    givenAdresseSansOperateur();

    await whenEcranAffiche();

    expect(texte('synthese-adresse-invalide')).toContain('ne désigne pas une semaine que le calendrier porte');
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

    expect(texte('synthese-error')).toContain('Impossible de charger la synthèse des heures.');
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

  const lignes = (selector: string): string[] =>
    [...racine().querySelectorAll<HTMLElement>(dataSelector(selector))].flatMap(element =>
      [...element.children].map(ligne => normalise(ligne.textContent)),
    );

  const jourMarqueAujourdhui = (): string =>
    normalise(requis('synthese-aujourdhui').closest('th')?.querySelector(dataSelector('synthese-jour'))?.textContent ?? '');

  const titres = (selector: string): string[] =>
    [...racine().querySelectorAll<HTMLElement>(dataSelector(selector))].map(element => element.getAttribute('title') ?? '');

  const valeurChoisie = (selector: string): string => selectRequis(selector).value;

  const optionsDe = (selector: string): string[] => [...selectRequis(selector).options].map(option => option.value);
});
