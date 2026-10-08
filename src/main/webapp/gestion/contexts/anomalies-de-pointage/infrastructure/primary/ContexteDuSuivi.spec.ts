import {
  ARRET_FIXTURE,
  dossierDeFinAutomatiqueFixture,
  faitFixture,
  pointageFixture,
} from '@test/unit/fixtures/gestion/anomalies-de-pointage/DossierAnomalie.fixture';
import { describe, expect, it } from 'vitest';
import { DossierAnomalie } from '../../domain/dossier/DossierAnomalie';
import { PerimetreDuDossier } from '../../domain/dossier/PerimetreDuDossier';
import { contexteDuSuivi } from './ContexteDuSuivi';

const MATIN = new Date(2026, 8, 14, 8, 0);
const SOIR = new Date(2026, 8, 14, 17, 0);
const MAINTENANT = new Date(2026, 9, 5, 10, 0);

interface PointageHorsDeLAnomalie {
  readonly instant: Date;
  readonly operateur?: string;
  readonly annule?: true;
}

const pointageDe = (id: string, instant: Date, options: Partial<PointageHorsDeLAnomalie> = {}) =>
  pointageFixture(id, faitFixture(ARRET_FIXTURE, instant.toISOString(), { operateur: options.operateur ?? 'op-camille' }), {
    ...(options.annule === undefined ? {} : { annulation: { motif: 'Erreur', auteur: 'camille', instant: SOIR.toISOString() } }),
  });

const dossierSurUneJourneeFixture = (debut: Date, fin: Date, horsDeLAnomalie: readonly PointageHorsDeLAnomalie[]) => {
  const dansLAnomalie = [pointageDe('debut-8', debut), pointageDe('fin-17', fin)];
  return dossierDeFinAutomatiqueFixture({
    activites: [],
    journal: [...dansLAnomalie, ...horsDeLAnomalie.map((hors, rang) => pointageDe(`hors-${rang}`, hors.instant, hors))],
    perimetre: new PerimetreDuDossier(dansLAnomalie.map(pointage => pointage.id)),
  });
};

const contexte = (dossier: DossierAnomalie, operateur = 'Camille Martin'): string | undefined =>
  contexteDuSuivi(dossier, MAINTENANT, operateur);

const phrase = (groupes: string, operateur = 'Camille Martin'): string =>
  `Hors de cette anomalie, ${operateur} compte sur cet élément ${groupes}.`;

describe('Summary of what the operator pointed on the element beyond the anomaly', () => {
  it.each([
    ['earlier on the day of the anomaly, from when', [new Date(2026, 8, 14, 6, 0)], '1 pointage plus tôt ce jour-là (dès 06:00)'],
    ['during the period of the anomaly', [new Date(2026, 8, 14, 10, 0)], '1 pointage pendant cette période'],
    ['later on the day of the anomaly, until when', [new Date(2026, 8, 14, 20, 0)], '1 pointage plus tard ce jour-là (jusqu’à 20:00)'],
    [
      'on the previous days, since which day',
      [new Date(2026, 8, 11, 11, 0), new Date(2026, 8, 10, 9, 0), new Date(2026, 8, 10, 15, 0)],
      '3 pointages les jours précédents, depuis le jeudi 10 septembre',
    ],
    [
      'on the following days, until which day',
      [new Date(2026, 8, 15, 9, 0), new Date(2026, 8, 16, 18, 0)],
      '2 pointages les jours suivants, jusqu’au mercredi 16 septembre',
    ],
    [
      'on other days when they are both before and after, without a day',
      [new Date(2026, 8, 10, 9, 0), new Date(2026, 8, 15, 9, 0)],
      '2 pointages les autres jours',
    ],
  ])('should say how many pointages the operator made %s', (_groupe, instants, attendu) => {
    const dossier = dossierSurUneJourneeFixture(
      MATIN,
      SOIR,
      instants.map(instant => ({ instant })),
    );

    expect(contexte(dossier)).toBe(phrase(attendu));
  });

  it('should join the groups, name the pointages in the first one and tell the earliest and the latest hours', () => {
    const dossier = dossierSurUneJourneeFixture(MATIN, SOIR, [
      { instant: new Date(2026, 8, 14, 7, 0) },
      { instant: new Date(2026, 8, 14, 6, 0) },
      { instant: new Date(2026, 8, 14, 10, 0) },
      { instant: new Date(2026, 8, 14, 20, 0) },
      { instant: new Date(2026, 8, 14, 21, 30) },
      { instant: new Date(2026, 8, 10, 9, 0) },
    ]);

    expect(contexte(dossier)).toBe(
      phrase(
        '2 pointages plus tôt ce jour-là (dès 06:00), 1 pendant cette période, 2 plus tard ce jour-là (jusqu’à 21:30) et 1 les jours précédents, depuis le jeudi 10 septembre',
      ),
    );
  });

  it('should join two groups with and', () => {
    const dossier = dossierSurUneJourneeFixture(MATIN, SOIR, [
      { instant: new Date(2026, 8, 14, 10, 0) },
      { instant: new Date(2026, 8, 15, 9, 0) },
    ]);

    expect(contexte(dossier)).toBe(phrase('1 pointage pendant cette période et 1 les jours suivants, jusqu’au mardi 15 septembre'));
  });

  it('should not count the cancelled pointages', () => {
    const dossier = dossierSurUneJourneeFixture(MATIN, SOIR, [
      { instant: new Date(2026, 8, 14, 9, 30), annule: true },
      { instant: new Date(2026, 8, 14, 10, 0) },
    ]);

    expect(contexte(dossier)).toBe(phrase('1 pointage pendant cette période'));
  });

  it('should not count the pointages of another operator', () => {
    const dossier = dossierSurUneJourneeFixture(MATIN, SOIR, [
      { instant: new Date(2026, 8, 14, 9, 0), operateur: 'op-alex' },
      { instant: new Date(2026, 8, 14, 10, 0) },
    ]);

    expect(contexte(dossier)).toBe(phrase('1 pointage pendant cette période'));
  });

  it.each<[string, readonly PointageHorsDeLAnomalie[]]>([
    ['holds no pointage beyond the anomaly', []],
    ['holds only cancelled pointages beyond the anomaly', [{ instant: new Date(2026, 8, 14, 10, 0), annule: true }]],
    ['holds only pointages of another operator beyond the anomaly', [{ instant: new Date(2026, 8, 14, 10, 0), operateur: 'op-alex' }]],
  ])('should say nothing when the journal %s', (_cas, horsDeLAnomalie) => {
    expect(contexte(dossierSurUneJourneeFixture(MATIN, SOIR, horsDeLAnomalie))).toBeUndefined();
  });

  it('should say nothing when the anomaly itself shows no pointage and no activity to measure the period from', () => {
    const dossier = dossierSurUneJourneeFixture(MATIN, SOIR, [{ instant: new Date(2026, 8, 14, 10, 0) }]);

    expect(contexte({ ...dossier, perimetre: new PerimetreDuDossier([]) })).toBeUndefined();
  });

  it('should say the operator when no name is resolved', () => {
    const dossier = dossierSurUneJourneeFixture(MATIN, SOIR, [{ instant: new Date(2026, 8, 14, 10, 0) }]);

    expect(contexteDuSuivi(dossier, MAINTENANT, undefined)).toBe(phrase('1 pointage pendant cette période', 'l’opérateur'));
  });

  it('should name the days when the period of the anomaly spans two days', () => {
    const dossier = dossierSurUneJourneeFixture(new Date(2026, 8, 14, 22, 0), new Date(2026, 8, 15, 2, 0), [
      { instant: new Date(2026, 8, 14, 20, 0) },
      { instant: new Date(2026, 8, 15, 4, 0) },
    ]);

    expect(contexte(dossier)).toBe(
      phrase('1 pointage plus tôt le lundi 14 septembre (dès 20:00) et 1 plus tard le mardi 15 septembre (jusqu’à 04:00)'),
    );
  });

  it('should tell apart the days by the local clock near midnight', () => {
    const dossier = dossierSurUneJourneeFixture(new Date(2026, 8, 14, 0, 30), new Date(2026, 8, 14, 23, 30), [
      { instant: new Date(2026, 8, 13, 23, 59) },
      { instant: new Date(2026, 8, 14, 0, 10) },
      { instant: new Date(2026, 8, 14, 23, 50) },
      { instant: new Date(2026, 8, 15, 0, 1) },
    ]);

    expect(contexte(dossier)).toBe(
      phrase('1 pointage plus tôt ce jour-là (dès 00:10), 1 plus tard ce jour-là (jusqu’à 23:50) et 2 les autres jours'),
    );
  });

  it('should spell the year of a day that is not in the current year', () => {
    const dossier = dossierSurUneJourneeFixture(MATIN, SOIR, [{ instant: new Date(2025, 11, 30, 9, 0) }]);

    expect(contexte(dossier)).toBe(phrase('1 pointage les jours précédents, depuis le mardi 30 décembre 2025'));
  });
});
