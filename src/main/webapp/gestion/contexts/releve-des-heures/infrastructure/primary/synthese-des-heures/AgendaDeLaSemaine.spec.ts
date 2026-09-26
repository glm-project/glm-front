import { DureeTravaillee } from '../../../domain/duree/DureeTravaillee';
import { InstantDeReleve } from '../../../domain/releve/InstantDeReleve';
import { JourDeReleve } from '../../../domain/releve/JourDeReleve';
import { PlageDeReleve } from '../../../domain/releve/PlageDeReleve';
import { PointageDeReleve } from '../../../domain/releve/PointageDeReleve';
import { TypeDePointage } from '../../../domain/releve/TypeDePointage';
import { JourCalendaire } from '../../../domain/semaine/JourCalendaire';
import { AgendaDeLaSemaine, ColonneDessinee, Dessin, DessinDePlage } from './AgendaDeLaSemaine';

/** Une heure locale du lundi 14 septembre ; 24 h désigne le minuit du mardi, borne d'une plage coupée par le back. */
type Heure = readonly [number, number];

const instantFixture = ([heure, minute]: Heure): InstantDeReleve => new InstantDeReleve(new Date(2026, 8, 14, heure, minute).toISOString());

const plageFixture = (debut: Heure, fin: Heure | undefined, presumee = false): PlageDeReleve =>
  new PlageDeReleve(instantFixture(debut), fin === undefined ? undefined : instantFixture(fin), presumee);

const pointageFixture = (type: TypeDePointage, heure: Heure): PointageDeReleve => new PointageDeReleve(type, instantFixture(heure));

interface JourFixture {
  readonly pointages?: readonly PointageDeReleve[];
  readonly plages?: readonly PlageDeReleve[];
}

const jourFixture = ({ pointages = [], plages = [] }: JourFixture): JourDeReleve =>
  new JourDeReleve({
    jour: new JourCalendaire('2026-09-14'),
    dureePointee: new DureeTravaillee('PT7H30M'),
    dureePresumee: new DureeTravaillee('PT0S'),
    pointages,
    plages,
  });

const journeeOrdinaireFixture = (): JourDeReleve =>
  jourFixture({
    pointages: [
      pointageFixture('ARRIVEE', [8, 0]),
      pointageFixture('PAUSE', [12, 0]),
      pointageFixture('REPRISE', [13, 0]),
      pointageFixture('DEPART', [17, 0]),
    ],
    plages: [plageFixture([8, 0], [12, 0]), plageFixture([13, 0], [17, 0])],
  });

const arrondi = (valeur: number): number => Math.round(valeur * 100) / 100;

const plagesDessinees = (colonne: ColonneDessinee): DessinDePlage[] => colonne.dessins.filter(dessin => dessin.kind === 'PLAGE');

const projeterPlage = (dessin: DessinDePlage): string =>
  `${dessin.classe} ${String(arrondi(dessin.haut))}+${String(arrondi(dessin.hauteur))}`;

const projeterDessin = (dessin: Dessin): string => {
  switch (dessin.kind) {
    case 'PLAGE':
      return `plage ${String(arrondi(dessin.haut))}`;
    case 'PLAGE_EN_COURS':
      return `en cours ${String(arrondi(dessin.haut))}, puce ${dessin.puce.placement} ${String(arrondi(dessin.puce.haut))}`;
    case 'PAUSE':
      return `pause ${String(arrondi(dessin.haut))}+${String(arrondi(dessin.hauteur))}${dessin.etiquetee ? ' étiquetée' : ''}${dessin.depuisLaVeille ? ' depuis la veille' : ''}`;
    case 'PAUSE_SANS_REPRISE':
      return `sans reprise ${String(arrondi(dessin.haut))}${dessin.enCours ? ' en cours' : ''}, puce ${dessin.puce.placement} ${String(arrondi(dessin.puce.haut))}`;
  }
};

const projeterNotes = (colonne: ColonneDessinee): string[] =>
  colonne.notes.map(note => `${note.placement} ${String(arrondi(note.haut))} (${String(note.plages.length)})`);

/** Le jour entier, vingt pixels par heure : une plage venue de la veille l'ouvre sans rien ajouter d'autre à la colonne. */
const surLeJourEntier = (plages: readonly PlageDeReleve[]): JourDeReleve =>
  jourFixture({ plages: [plageFixture([0, 0], [0, 30]), ...plages] });

describe('AgendaDeLaSemaine', () => {
  describe('axis', () => {
    it('should hold an ordinary week on the daytime hours, twenty-eight pixels an hour', () => {
      const agenda = new AgendaDeLaSemaine([journeeOrdinaireFixture()]);

      expect([agenda.debut, agenda.fin, agenda.hauteur]).toEqual([6 * 60, 22 * 60, 448]);
    });

    it('should hold a week carrying no interval on the daytime hours', () => {
      const agenda = new AgendaDeLaSemaine([jourFixture({})]);

      expect([agenda.debut, agenda.fin]).toEqual([6 * 60, 22 * 60]);
    });

    it.each([
      ['an interval starting before the daytime hours', jourFixture({ plages: [plageFixture([5, 30], [13, 0])] })],
      ['an interval ending after the daytime hours', jourFixture({ plages: [plageFixture([14, 0], [22, 30])] })],
      ['an interval still in progress since before the daytime hours', jourFixture({ plages: [plageFixture([5, 0], undefined)] })],
      ['an interval coming from the day before', jourFixture({ plages: [plageFixture([0, 0], [7, 0])] })],
      ['an interval going on the day after', jourFixture({ plages: [plageFixture([20, 0], [24, 0])] })],
      [
        'a break coming from the day before',
        jourFixture({
          pointages: [pointageFixture('REPRISE', [6, 10]), pointageFixture('DEPART', [9, 0])],
          plages: [plageFixture([6, 10], [9, 0])],
        }),
      ],
      [
        'a break without resumption after the daytime hours',
        jourFixture({
          pointages: [pointageFixture('ARRIVEE', [14, 0]), pointageFixture('PAUSE', [22, 10])],
          plages: [plageFixture([14, 0], [22, 10])],
        }),
      ],
    ])('should open onto the whole day, twenty pixels an hour, for %s', (_cas, jour) => {
      const agenda = new AgendaDeLaSemaine([jour]);

      expect([agenda.debut, agenda.fin, agenda.hauteur]).toEqual([0, 24 * 60, 480]);
    });

    it('should open onto the whole day for the one day of the week that leaves the daytime hours', () => {
      const agenda = new AgendaDeLaSemaine([journeeOrdinaireFixture(), jourFixture({ plages: [plageFixture([20, 0], [23, 0])] })]);

      expect([agenda.debut, agenda.fin]).toEqual([0, 24 * 60]);
    });

    it('should mark every two hours of the daytime hours', () => {
      const agenda = new AgendaDeLaSemaine([journeeOrdinaireFixture()]);

      expect(agenda.reperes().map(repere => `${repere.libelle}@${String(repere.haut)}`)).toEqual([
        '06:00@0',
        '08:00@56',
        '10:00@112',
        '12:00@168',
        '14:00@224',
        '16:00@280',
        '18:00@336',
        '20:00@392',
        '22:00@448',
      ]);
    });

    it('should mark every three hours of the whole day, closing it on 00:00 rather than 24:00', () => {
      const agenda = new AgendaDeLaSemaine([jourFixture({ plages: [plageFixture([22, 0], [24, 0])] })]);

      expect(agenda.reperes().map(repere => `${repere.libelle}@${String(repere.haut)}`)).toEqual([
        '00:00@0',
        '03:00@60',
        '06:00@120',
        '09:00@180',
        '12:00@240',
        '15:00@300',
        '18:00@360',
        '21:00@420',
        '00:00@480',
      ]);
    });

    /** Sans cet ancrage, la moitié extérieure des repères d'extrémité sort de la cellule et se fait couper. */
    it('should anchor the marks that sit on the edges of the axis', () => {
      const agenda = new AgendaDeLaSemaine([journeeOrdinaireFixture()]);
      const ancrages = agenda.reperes().map(repere => repere.ancrage);

      expect([ancrages[0], ancrages[4], ancrages[ancrages.length - 1]]).toEqual(['haut', 'centre', 'bas']);
    });

    it('should identify each mark by its own minute, two of them sharing a label', () => {
      const agenda = new AgendaDeLaSemaine([jourFixture({ plages: [plageFixture([22, 0], [24, 0])] })]);
      const minutes = agenda.reperes().map(repere => repere.minutes);

      expect(new Set(minutes).size).toBe(minutes.length);
    });
  });

  describe('intervals', () => {
    it('should place an interval at its start, as tall as it lasts', () => {
      const jour = jourFixture({ plages: [plageFixture([8, 0], [12, 0])] });

      const colonne = new AgendaDeLaSemaine([jour]).colonne(jour, false);

      expect(plagesDessinees(colonne).map(projeterPlage)).toEqual(['longue 56+112']);
    });

    it.each([
      [108, 'longue'],
      [107, 'moyenne'],
      [54, 'moyenne'],
      [53, 'courte'],
    ])('should class an interval of %i minutes on the whole day as %s', (minutes, classe) => {
      const jour = surLeJourEntier([plageFixture([12, 0], [12 + Math.floor(minutes / 60), minutes % 60])]);

      const colonne = new AgendaDeLaSemaine([jour]).colonne(jour, false);

      expect(plagesDessinees(colonne)[1]?.classe).toBe(classe);
    });

    it('should draw a short interval at its real height', () => {
      const jour = jourFixture({ plages: [plageFixture([15, 10], [15, 25])] });

      const colonne = new AgendaDeLaSemaine([jour]).colonne(jour, false);

      expect(plagesDessinees(colonne).map(projeterPlage)).toEqual(['courte 256.67+7']);
    });

    it('should draw an interval of zero duration three pixels tall', () => {
      const jour = jourFixture({ plages: [plageFixture([15, 10], [15, 10])] });

      const colonne = new AgendaDeLaSemaine([jour]).colonne(jour, false);

      expect(plagesDessinees(colonne).map(projeterPlage)).toEqual(['courte 256.67+3']);
    });

    it('should draw an interval going on the day after down to the end of the day, and say it goes on', () => {
      const jour = jourFixture({ plages: [plageFixture([20, 0], [24, 0])] });

      const colonne = new AgendaDeLaSemaine([jour]).colonne(jour, false);

      expect(plagesDessinees(colonne).map(dessin => [projeterPlage(dessin), dessin.depuisLaVeille, dessin.seLePoursuit])).toEqual([
        ['longue 400+80', false, true],
      ]);
    });

    it('should say that an interval starting at midnight comes from the day before', () => {
      const jour = jourFixture({ plages: [plageFixture([0, 0], [7, 5])] });

      const colonne = new AgendaDeLaSemaine([jour]).colonne(jour, false);

      expect(plagesDessinees(colonne).map(dessin => [dessin.depuisLaVeille, dessin.seLePoursuit])).toEqual([[true, false]]);
    });
  });

  describe('notes of short intervals', () => {
    it('should name a short interval by a note placed under it', () => {
      const jour = jourFixture({ plages: [plageFixture([8, 0], [12, 0]), plageFixture([15, 10], [15, 20])] });

      const colonne = new AgendaDeLaSemaine([jour]).colonne(jour, false);

      expect(projeterNotes(colonne)).toEqual(['dessous 267.33 (1)']);
    });

    it('should share one note between short intervals close to one another', () => {
      const jour = jourFixture({ plages: [plageFixture([15, 10], [15, 10]), plageFixture([15, 20], [15, 30])] });

      const colonne = new AgendaDeLaSemaine([jour]).colonne(jour, false);

      expect(projeterNotes(colonne)).toEqual(['dessous 272 (2)']);
    });

    it('should give short intervals far from one another a note each', () => {
      const jour = jourFixture({ plages: [plageFixture([15, 10], [15, 20]), plageFixture([17, 10], [17, 20])] });

      const colonne = new AgendaDeLaSemaine([jour]).colonne(jour, false);

      expect(projeterNotes(colonne)).toEqual(['dessous 267.33 (1)', 'dessous 323.33 (1)']);
    });

    it('should place the note above a short interval when below it would run into the next block', () => {
      const jour = jourFixture({ plages: [plageFixture([11, 50], [12, 0]), plageFixture([12, 10], [16, 0])] });

      const colonne = new AgendaDeLaSemaine([jour]).colonne(jour, false);

      expect(projeterNotes(colonne)).toEqual(['dessus 133.33 (1)']);
    });

    it('should place the note above a short interval when below it would leave the grid', () => {
      const jour = jourFixture({ plages: [plageFixture([8, 0], [12, 0]), plageFixture([21, 40], [21, 50])] });

      const colonne = new AgendaDeLaSemaine([jour]).colonne(jour, false);

      expect(projeterNotes(colonne)).toEqual(['dessus 408.67 (1)']);
    });

    it('should keep the note below a short interval when above it would leave the grid too', () => {
      const jour = jourFixture({ plages: [plageFixture([6, 0], [6, 10]), plageFixture([6, 20], [10, 0])] });

      const colonne = new AgendaDeLaSemaine([jour]).colonne(jour, false);

      expect(projeterNotes(colonne)).toEqual(['dessous 10.67 (1)']);
    });
  });

  describe('breaks and marks', () => {
    it('should draw the breaks between the intervals of a day, in the order of the hours', () => {
      const jour = journeeOrdinaireFixture();

      const colonne = new AgendaDeLaSemaine([jour]).colonne(jour, false);

      expect(colonne.dessins.map(projeterDessin)).toEqual(['plage 56', 'pause 168+28 étiquetée', 'plage 196']);
    });

    it('should leave unlabelled a break too short for its label', () => {
      const jour = jourFixture({
        pointages: [pointageFixture('ARRIVEE', [8, 0]), pointageFixture('PAUSE', [10, 0]), pointageFixture('REPRISE', [10, 15])],
        plages: [plageFixture([8, 0], [10, 0]), plageFixture([10, 15], [12, 0])],
      });

      const colonne = new AgendaDeLaSemaine([jour]).colonne(jour, false);

      expect(colonne.dessins.map(projeterDessin)).toContain('pause 112+7');
    });

    it('should draw a break coming from the day before from midnight', () => {
      const jour = jourFixture({
        pointages: [pointageFixture('REPRISE', [0, 30]), pointageFixture('DEPART', [7, 0])],
        plages: [plageFixture([0, 30], [7, 0])],
      });

      const colonne = new AgendaDeLaSemaine([jour]).colonne(jour, false);

      expect(colonne.dessins.map(projeterDessin)).toEqual(['pause 0+10 depuis la veille', 'plage 10']);
    });

    it('should mark a break without resumption on a past day at its start, without height, its one-line chip above the end of the grid', () => {
      const jour = jourFixture({
        pointages: [pointageFixture('ARRIVEE', [18, 58]), pointageFixture('PAUSE', [23, 40])],
        plages: [plageFixture([18, 58], [23, 40])],
      });

      const colonne = new AgendaDeLaSemaine([jour]).colonne(jour, false);

      expect(colonne.dessins.map(projeterDessin)).toEqual(['plage 379.33', 'sans reprise 473.33, puce dessus 443.33']);
    });

    it('should mark a break without resumption today as still in progress, its chip two lines tall', () => {
      const jour = jourFixture({
        pointages: [pointageFixture('ARRIVEE', [8, 0]), pointageFixture('PAUSE', [10, 0])],
        plages: [plageFixture([8, 0], [10, 0])],
      });

      const colonne = new AgendaDeLaSemaine([jour]).colonne(jour, true);

      expect(colonne.dessins.map(projeterDessin)).toEqual(['plage 56', 'sans reprise 112 en cours, puce dessous 118']);
    });

    it('should mark an interval still in progress at its start, without height, its chip under the mark', () => {
      const jour = jourFixture({ pointages: [pointageFixture('ARRIVEE', [8, 3])], plages: [plageFixture([8, 3], undefined)] });

      const colonne = new AgendaDeLaSemaine([jour]).colonne(jour, false);

      expect(colonne.dessins.map(projeterDessin)).toEqual(['en cours 57.4, puce dessous 63.4']);
    });

    it('should place the chip of an interval in progress above its mark near the end of the grid', () => {
      const jour = jourFixture({ pointages: [pointageFixture('ARRIVEE', [21, 45])], plages: [plageFixture([21, 45], undefined)] });

      const colonne = new AgendaDeLaSemaine([jour]).colonne(jour, false);

      expect(colonne.dessins.map(projeterDessin)).toEqual(['en cours 441, puce dessus 395']);
    });

    it('should place the note of a short interval above it when the break that follows would hide it', () => {
      const jour = jourFixture({
        pointages: [
          pointageFixture('ARRIVEE', [15, 10]),
          pointageFixture('PAUSE', [15, 20]),
          pointageFixture('REPRISE', [16, 30]),
          pointageFixture('DEPART', [17, 30]),
        ],
        plages: [plageFixture([15, 10], [15, 20]), plageFixture([16, 30], [17, 30])],
      });

      const colonne = new AgendaDeLaSemaine([jour]).colonne(jour, false);

      expect(projeterNotes(colonne)).toEqual(['dessus 226.67 (1)']);
    });
  });
});
