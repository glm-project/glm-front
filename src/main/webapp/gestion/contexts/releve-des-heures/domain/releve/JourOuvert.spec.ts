import { DureeTravaillee } from '../duree/DureeTravaillee';
import { JourCalendaire } from '../semaine/JourCalendaire';
import { SemaineISO } from '../semaine/SemaineISO';
import { IdentiteOperateur } from './IdentiteOperateur';
import { InstantDeReleve } from './InstantDeReleve';
import { JourDeReleve } from './JourDeReleve';
import { JourAOuvrir, jourOuvert } from './JourOuvert';
import { PlageDeReleve } from './PlageDeReleve';
import { PointageDePresence } from './PointageDePresence';
import { ReleveDesHeures } from './ReleveDesHeures';

const SEMAINE_PASSEE = new SemaineISO(2026, 37);
const SEMAINE_EN_COURS = new SemaineISO(2026, 38);
const AUJOURDHUI = new JourCalendaire('2026-09-17');
const ABSENT: JourAOuvrir = { kind: 'ABSENT' };

const jourFixture = (jour: JourCalendaire, fiche: { pointe?: boolean; couvert?: boolean }): JourDeReleve => {
  const instant = new InstantDeReleve(`${jour.value}T08:00:00Z`);
  return new JourDeReleve({
    jour,
    operationnelPointe: new DureeTravaillee('PT0S'),
    operationnelPresume: new DureeTravaillee('PT0S'),
    intervalles: [],
    pointages: fiche.pointe === true ? [new PointageDePresence('ARRIVEE', instant)] : [],
    plages: fiche.couvert === true ? [new PlageDeReleve(instant, new InstantDeReleve(`${jour.value}T09:00:00Z`), false)] : [],
  });
};

const releveFixture = (semaine: SemaineISO, jours: Readonly<Record<number, { pointe?: boolean; couvert?: boolean }>>): ReleveDesHeures =>
  new ReleveDesHeures(semaine, {
    operateur: new IdentiteOperateur('Dupont', 'Jean'),
    elements: [],
    presencePointee: new DureeTravaillee('PT0S'),
    presencePresumee: new DureeTravaillee('PT0S'),
    operationnelPointe: new DureeTravaillee('PT0S'),
    operationnelPresume: new DureeTravaillee('PT0S'),
    jours: semaine.jours().map((jour, rang) => jourFixture(jour, jours[rang] ?? {})),
  });

describe('jourOuvert', () => {
  it('should open the day the address names, even when it carries nothing', () => {
    const releve = releveFixture(SEMAINE_EN_COURS, { 0: { pointe: true } });

    const jour = jourOuvert({ kind: 'NOMME', jour: new JourCalendaire('2026-09-16') }, SEMAINE_EN_COURS, releve, AUJOURDHUI);

    expect(jour?.value).toBe('2026-09-16');
  });

  it('should open today on the week in progress, empty as it may be', () => {
    const releve = releveFixture(SEMAINE_EN_COURS, { 0: { pointe: true } });

    const jour = jourOuvert(ABSENT, SEMAINE_EN_COURS, releve, AUJOURDHUI);

    expect(jour?.value).toBe('2026-09-17');
  });

  it('should open the first day carrying a clocking of a past week', () => {
    const releve = releveFixture(SEMAINE_PASSEE, { 1: { pointe: true }, 4: { pointe: true } });

    const jour = jourOuvert(ABSENT, SEMAINE_PASSEE, releve, AUJOURDHUI);

    expect(jour?.value).toBe('2026-09-08');
  });

  it('should open no day of a past week that carries no clocking, a presence alone being none', () => {
    const releve = releveFixture(SEMAINE_PASSEE, { 2: { couvert: true } });

    const jour = jourOuvert(ABSENT, SEMAINE_PASSEE, releve, AUJOURDHUI);

    expect(jour).toBeUndefined();
  });
});
