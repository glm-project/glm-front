import { DureeTravaillee } from '../../../domain/duree/DureeTravaillee';
import { InstantDeReleve } from '../../../domain/releve/InstantDeReleve';
import { JourDeReleve } from '../../../domain/releve/JourDeReleve';
import { PlageDeReleve } from '../../../domain/releve/PlageDeReleve';
import { JourCalendaire } from '../../../domain/semaine/JourCalendaire';
import { AgendaDeLaSemaine } from './AgendaDeLaSemaine';

const HEURES_DE_JOUR = [6 * 60, 22 * 60];
const JOUR_ENTIER = [0, 24 * 60];

/** Une heure locale du lundi 14 septembre ; 24 h désigne le minuit du mardi, borne d'une plage coupée par le back. */
const instantFixture = (heure: number, minute = 0): InstantDeReleve =>
  new InstantDeReleve(new Date(2026, 8, 14, heure, minute).toISOString());

const plageFixture = (debut: number, fin: number | undefined, presumee = false): PlageDeReleve =>
  new PlageDeReleve(instantFixture(debut), fin === undefined ? undefined : instantFixture(fin), presumee);

const jourFixture = (plages: readonly PlageDeReleve[]): JourDeReleve =>
  new JourDeReleve({
    jour: new JourCalendaire('2026-09-14'),
    dureePointee: new DureeTravaillee('PT7H30M'),
    dureePresumee: new DureeTravaillee('PT0S'),
    pointages: [],
    plages,
  });

const journeeOrdinaireFixture = (): JourDeReleve =>
  jourFixture([
    new PlageDeReleve(instantFixture(8, 2), instantFixture(12), false),
    new PlageDeReleve(instantFixture(13), instantFixture(17, 32), false),
  ]);

const arrondi = (valeur: number): number => Math.round(valeur * 10) / 10;

const barresDe = (agenda: AgendaDeLaSemaine, jour: JourDeReleve): { gauche: number; largeur: number }[] =>
  jour.plages.map(plage => agenda.dessine(plage)).map(dessin => ({ gauche: arrondi(dessin.gauche), largeur: arrondi(dessin.largeur) }));

describe('AgendaDeLaSemaine', () => {
  it('should hold an ordinary week on the daytime hours', () => {
    const agenda = new AgendaDeLaSemaine([journeeOrdinaireFixture()]);

    expect([agenda.debut, agenda.fin]).toEqual(HEURES_DE_JOUR);
  });

  it('should hold a week carrying no interval on the daytime hours', () => {
    const agenda = new AgendaDeLaSemaine([jourFixture([])]);

    expect([agenda.debut, agenda.fin]).toEqual(HEURES_DE_JOUR);
  });

  it.each([
    ['an interval starting before the daytime hours', plageFixture(5, 13)],
    ['an interval ending after the daytime hours', plageFixture(14, 23)],
    ['an interval still in progress since before the daytime hours', plageFixture(5, undefined)],
    ['an interval coming from the day before', plageFixture(0, 7)],
    ['an interval going on the day after', plageFixture(20, 24)],
  ])('should open onto the whole day for %s', (_cas, plage) => {
    const agenda = new AgendaDeLaSemaine([jourFixture([plage])]);

    expect([agenda.debut, agenda.fin]).toEqual(JOUR_ENTIER);
  });

  it('should open onto the whole day for the one day of the week that leaves it', () => {
    const agenda = new AgendaDeLaSemaine([journeeOrdinaireFixture(), jourFixture([plageFixture(20, 23)])]);

    expect([agenda.debut, agenda.fin]).toEqual(JOUR_ENTIER);
  });

  it('should draw an interval going on the day after up to the end of the day, in one piece', () => {
    const jour = jourFixture([plageFixture(20, 24)]);
    const agenda = new AgendaDeLaSemaine([jour]);

    expect(barresDe(agenda, jour)).toEqual([{ gauche: arrondi((20 / 24) * 100), largeur: arrondi((4 / 24) * 100) }]);
  });

  it('should place each interval of a day along the span', () => {
    const jour = journeeOrdinaireFixture();
    const agenda = new AgendaDeLaSemaine([jour]);

    expect(barresDe(agenda, jour)).toEqual([
      { gauche: 12.7, largeur: 24.8 },
      { gauche: 43.8, largeur: 28.3 },
    ]);
  });

  it('should tell a presumed interval apart from a clocked one', () => {
    const jour = jourFixture([plageFixture(8, 10), plageFixture(10, 15, true)]);
    const agenda = new AgendaDeLaSemaine([jour]);

    expect(jour.plages.map(plage => agenda.dessine(plage).presumee)).toEqual([false, true]);
  });

  it('should draw an interval still in progress as a mark without width', () => {
    const jour = jourFixture([plageFixture(8, undefined)]);
    const agenda = new AgendaDeLaSemaine([jour]);

    expect(jour.plages.map(plage => agenda.dessine(plage))).toEqual([{ presumee: false, ouverte: true, gauche: 12.5, largeur: 0 }]);
  });

  it('should mark every two hours of the daytime hours', () => {
    const agenda = new AgendaDeLaSemaine([journeeOrdinaireFixture()]);

    expect(agenda.reperes().map(repere => repere.libelle)).toEqual([
      '06:00',
      '08:00',
      '10:00',
      '12:00',
      '14:00',
      '16:00',
      '18:00',
      '20:00',
      '22:00',
    ]);
  });

  it('should place each hour mark along the span', () => {
    const agenda = new AgendaDeLaSemaine([journeeOrdinaireFixture()]);

    expect(agenda.reperes().map(repere => arrondi(repere.gauche))).toEqual([0, 12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100]);
  });

  it('should mark every two hours of the whole day, midnight at both ends', () => {
    const agenda = new AgendaDeLaSemaine([jourFixture([plageFixture(22, 24)])]);
    const reperes = agenda.reperes();

    expect([reperes.length, reperes[0]?.libelle, reperes[reperes.length - 1]?.libelle]).toEqual([13, '00:00', '00:00']);
  });

  /** Sans cet ancrage, la moitié extérieure des repères d'extrémité sort de la cellule et se fait couper. */
  it('should anchor the marks that sit on the edges of the span', () => {
    const agenda = new AgendaDeLaSemaine([journeeOrdinaireFixture()]);
    const ancrages = agenda.reperes().map(repere => repere.ancrage);

    expect([ancrages[0], ancrages[4], ancrages[ancrages.length - 1]]).toEqual(['gauche', 'centre', 'droite']);
  });

  it('should identify each mark by its own minute, two of them sharing a label', () => {
    const agenda = new AgendaDeLaSemaine([jourFixture([plageFixture(22, 24)])]);
    const minutes = agenda.reperes().map(repere => repere.minutes);

    expect(new Set(minutes).size).toBe(minutes.length);
  });
});
