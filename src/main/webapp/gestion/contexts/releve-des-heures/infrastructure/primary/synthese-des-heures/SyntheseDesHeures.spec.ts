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
import { PointageDeReleve } from '../../../domain/releve/PointageDeReleve';
import { ReleveDesHeures } from '../../../domain/releve/ReleveDesHeures';
import { SyntheseDesHeuresPort } from '../../../domain/releve/SyntheseDesHeuresPort';
import { TypeDePointage } from '../../../domain/releve/TypeDePointage';
import { JourCalendaire } from '../../../domain/semaine/JourCalendaire';
import { SemaineISO } from '../../../domain/semaine/SemaineISO';
import { SyntheseDesHeures } from './SyntheseDesHeures';

const OPERATEUR = 'op-1';

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

/**
 * L'écran affiche l'heure d'un pointage dans le fuseau du navigateur. Une fixture écrite en UTC rendrait donc
 * l'attente dépendante du fuseau de la machine — 08:02 à Paris, 06:02 sur un runner en UTC. Partir d'une heure
 * locale garde le scénario vrai partout, sans cesser de prouver que l'écran formate bien l'instant reçu.
 */
const pointageFixture = (type: TypeDePointage, heure: number, minute: number): PointageDeReleve =>
  new PointageDeReleve(type, new InstantDeReleve(new Date(2026, 8, 14, heure, minute).toISOString()));

const releveFixture = (semaine: SemaineISO, premierJour: JourDeReleve): ReleveDesHeures =>
  new ReleveDesHeures(semaine, {
    operateur: new IdentiteOperateur('Dupont', 'Jean'),
    total: new DureeTravaillee('PT7H30M'),
    jours: semaine.jours().map((jour, rang) => (rang === 0 ? premierJour : new JourDeReleve(jour, new DureeTravaillee('PT0S'), []))),
  });

const jourTravailleFixture = (semaine: SemaineISO): JourDeReleve =>
  new JourDeReleve(new JourCalendaire(semaine.lundi().value), new DureeTravaillee('PT7H30M'), [
    pointageFixture('ARRIVEE', 8, 2),
    pointageFixture('PAUSE', 12, 0),
    pointageFixture('REPRISE', 13, 0),
    pointageFixture('DEPART', 17, 32),
  ]);

/** Une journée encore ouverte : l'opérateur est arrivé et n'est pas parti. C'est le cas de tout jour en cours. */
const jourEnCoursFixture = (semaine: SemaineISO): JourDeReleve =>
  new JourDeReleve(new JourCalendaire(semaine.lundi().value), new DureeTravaillee('PT0S'), [pointageFixture('ARRIVEE', 8, 2)]);

const jourPointeSansDureeFixture = (semaine: SemaineISO): JourDeReleve =>
  new JourDeReleve(new JourCalendaire(semaine.lundi().value), new DureeTravaillee('PT0S'), [
    pointageFixture('ARRIVEE', 8, 2),
    pointageFixture('DEPART', 8, 2),
  ]);

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
    ['synthese-total', 'Total : 7 h 30'],
  ])('should display %s as %s for the week containing today', async (selector, attendu) => {
    givenSemaineSemee(new SemaineISO(2026, 38));

    await whenEcranAffiche();

    expect(texte(selector)).toBe(attendu);
  });

  it('should display the seven days of the week', async () => {
    givenSemaineSemee(new SemaineISO(2026, 38));

    await whenEcranAffiche();

    expect(textes('synthese-jour-cell')).toEqual(['lun. 14', 'mar. 15', 'mer. 16', 'jeu. 17', 'ven. 18', 'sam. 19', 'dim. 20']);
  });

  it('should display the worked time of each day', async () => {
    givenSemaineSemee(new SemaineISO(2026, 38));

    await whenEcranAffiche();

    expect(textes('synthese-duree-cell')).toEqual(['7 h 30', '—', '—', '—', '—', '—', '—']);
  });

  it('should name each clocking by its kind and its hour once the journal is opened', async () => {
    givenSemaineSemee(new SemaineISO(2026, 38));
    await whenEcranAffiche();

    await whenJournalDeplie();

    expect(textes('synthese-pointage')).toEqual(['Arrivée 08:02', 'Pause 12:00', 'Reprise 13:00', 'Départ 17:32']);
  });

  it('should keep the journal closed until it is asked for', async () => {
    givenSemaineSemee(new SemaineISO(2026, 38));

    await whenEcranAffiche();

    expect(present('synthese-journal')).toBe(false);
  });

  it('should close the journal a second click dismisses', async () => {
    givenSemaineSemee(new SemaineISO(2026, 38));
    await whenEcranAffiche();
    await whenJournalDeplie();

    await whenJournalDeplie();

    expect(present('synthese-journal')).toBe(false);
  });

  it('should draw the presence and the break of a worked day', async () => {
    givenSemaineSemee(new SemaineISO(2026, 38));

    await whenEcranAffiche();

    expect(nombreDe('synthese-segment')).toBe(3);
  });

  it('should offer no track on a day carrying no clocking', async () => {
    givenSemaineSemee(new SemaineISO(2026, 38));

    await whenEcranAffiche();

    expect(nombreDe('synthese-piste')).toBe(1);
  });

  it('should scale the week on the working day', async () => {
    givenSemaineSemee(new SemaineISO(2026, 38));

    await whenEcranAffiche();

    expect(textes('synthese-repere')).toEqual(['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00']);
  });

  it('should display a day carrying no clocking as no clocking at all', async () => {
    givenSemaineSemee(new SemaineISO(2026, 38));

    await whenEcranAffiche();

    expect(textes('synthese-jour-sans-pointage')).toHaveLength(6);
  });

  it('should display a day clocked within the minute as zero hours rather than as absent', async () => {
    const semaine = new SemaineISO(2026, 38);
    givenReleve(semaine, releveFixture(semaine, jourPointeSansDureeFixture(semaine)));

    await whenEcranAffiche();

    expect(textes('synthese-duree-cell')[0]).toBe('0 h 00');
  });

  it('should mark a day still in progress as open rather than inventing its end', async () => {
    const semaine = new SemaineISO(2026, 38);
    givenReleve(semaine, releveFixture(semaine, jourEnCoursFixture(semaine)));

    await whenEcranAffiche();

    expect(titreDe('synthese-segment')).toBe('Présence depuis 08:02 · en cours');
  });

  it('should name a closed presence by its two hours', async () => {
    givenSemaineSemee(new SemaineISO(2026, 38));

    await whenEcranAffiche();

    expect(titreDe('synthese-segment')).toBe('Présence 08:02 – 12:00');
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

  const givenReleve = (semaine: SemaineISO, releve: ReleveDesHeures): void => {
    portFixture.releves.set(`${OPERATEUR}|${String(semaine.annee)}|${String(semaine.numero)}`, releve);
  };

  const givenSemaineSemee = (semaine: SemaineISO): void => {
    givenReleve(semaine, releveFixture(semaine, jourTravailleFixture(semaine)));
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

  const whenJournalDeplie = async (): Promise<void> => {
    requis('synthese-piste').click();
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

  /** `Intl.formatRange` emploie des espaces fines insécables : les normaliser garde les attentes lisibles. */
  const normalise = (valeur: string): string => valeur.replace(/[\u00a0\u2009\u202f]/g, ' ').trim();

  const texte = (selector: string): string => normalise(requis(selector).textContent);

  const textes = (selector: string): string[] =>
    [...racine().querySelectorAll<HTMLElement>(dataSelector(selector))].map(element => normalise(element.textContent));

  const present = (selector: string): boolean => racine().querySelector(dataSelector(selector)) !== null;

  const nombreDe = (selector: string): number => racine().querySelectorAll(dataSelector(selector)).length;

  const titreDe = (selector: string): string => requis(selector).getAttribute('title') ?? '';

  const valeurChoisie = (selector: string): string => selectRequis(selector).value;

  const optionsDe = (selector: string): string[] => [...selectRequis(selector).options].map(option => option.value);
});
