import { DureeTravaillee } from '../duree/DureeTravaillee';
import { JourCalendaire } from '../semaine/JourCalendaire';
import { SemaineISO } from '../semaine/SemaineISO';
import { IdentiteOperateur } from './IdentiteOperateur';
import { InstantDeReleve } from './InstantDeReleve';
import { JourDeReleve } from './JourDeReleve';
import { PointageDeReleve } from './PointageDeReleve';
import { FicheDuReleve, ReleveDesHeures } from './ReleveDesHeures';

const SEMAINE = new SemaineISO(2026, 38);

const jourFixture = (jour: string, duree = 'PT0S'): JourDeReleve =>
  new JourDeReleve(new JourCalendaire(jour), new DureeTravaillee(duree), []);

const semaineCompleteFixture = (): readonly JourDeReleve[] => SEMAINE.jours().map(jour => jourFixture(jour.value));

const ficheFixture = (jours: readonly JourDeReleve[]): FicheDuReleve => ({
  operateur: new IdentiteOperateur('Dupont', 'Jean'),
  jours,
  total: new DureeTravaillee('PT38H'),
});

describe('ReleveDesHeures', () => {
  it('should carry the seven days the week covers', () => {
    const releve = new ReleveDesHeures(SEMAINE, ficheFixture(semaineCompleteFixture()));

    expect(releve.jours.map(jour => jour.jour.value)).toEqual([
      '2026-09-14',
      '2026-09-15',
      '2026-09-16',
      '2026-09-17',
      '2026-09-18',
      '2026-09-19',
      '2026-09-20',
    ]);
  });

  it('should carry the week total the server computed', () => {
    const releve = new ReleveDesHeures(SEMAINE, ficheFixture(semaineCompleteFixture()));

    expect(releve.total).toMatchObject({ heures: 38, minutesRestantes: 0 });
  });

  it('should carry the operator the report resolved', () => {
    const releve = new ReleveDesHeures(SEMAINE, ficheFixture(semaineCompleteFixture()));

    expect(releve.operateur).toMatchObject({ nom: 'Dupont', prenom: 'Jean' });
  });

  it('should refuse a report that does not cover seven days', () => {
    const jours = semaineCompleteFixture().slice(0, 6);

    expect(() => new ReleveDesHeures(SEMAINE, ficheFixture(jours))).toThrow(
      'Le relevé reçu du serveur ne couvre pas les sept jours de la semaine demandée.',
    );
  });

  it('should refuse a report carrying more days than the week has', () => {
    const jours = [...semaineCompleteFixture(), jourFixture('2026-09-21')];

    expect(() => new ReleveDesHeures(SEMAINE, ficheFixture(jours))).toThrow(
      'Le relevé reçu du serveur ne couvre pas les sept jours de la semaine demandée.',
    );
  });

  it('should refuse a report carrying a day outside the week', () => {
    const jours = [...semaineCompleteFixture().slice(0, 6), jourFixture('2026-09-27')];

    expect(() => new ReleveDesHeures(SEMAINE, ficheFixture(jours))).toThrow(
      'Le relevé reçu du serveur ne couvre pas les sept jours de la semaine demandée.',
    );
  });

  it('should refuse a report whose days are out of calendar order', () => {
    const jours = [
      jourFixture('2026-09-15'),
      jourFixture('2026-09-14'),
      jourFixture('2026-09-16'),
      jourFixture('2026-09-17'),
      jourFixture('2026-09-18'),
      jourFixture('2026-09-19'),
      jourFixture('2026-09-20'),
    ];

    expect(() => new ReleveDesHeures(SEMAINE, ficheFixture(jours))).toThrow(
      'Le relevé reçu du serveur ne couvre pas les sept jours de la semaine demandée.',
    );
  });

  it('should keep its days independent of the list it was built from', () => {
    const jours = [...semaineCompleteFixture()];
    const releve = new ReleveDesHeures(SEMAINE, ficheFixture(jours));

    jours.pop();

    expect(releve.jours).toHaveLength(7);
  });
});

describe('JourDeReleve', () => {
  it('should report a day carrying no clocking as a day without clocking', () => {
    const jour = jourFixture('2026-09-19');

    expect(jour.estSansPointage()).toBe(true);
  });

  it('should report a day carrying a clocking as a worked day', () => {
    const pointage = new PointageDeReleve('ARRIVEE', new InstantDeReleve('2026-09-14T06:02:00Z'));
    const jour = new JourDeReleve(new JourCalendaire('2026-09-14'), new DureeTravaillee('PT0S'), [pointage]);

    expect(jour.estSansPointage()).toBe(false);
  });

  it('should keep its clockings independent of the list it was built from', () => {
    const pointages = [new PointageDeReleve('ARRIVEE', new InstantDeReleve('2026-09-14T06:02:00Z'))];
    const jour = new JourDeReleve(new JourCalendaire('2026-09-14'), new DureeTravaillee('PT0S'), pointages);

    pointages.pop();

    expect(jour.pointages).toHaveLength(1);
  });
});
