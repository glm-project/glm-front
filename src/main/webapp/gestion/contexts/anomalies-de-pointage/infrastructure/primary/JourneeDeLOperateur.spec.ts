import {
  activiteEchueFixture,
  ARRET_FIXTURE,
  correctionTardiveFixture,
  dossierDeFinAutomatiqueFixture,
  faitFixture,
  instantDuJourFixture,
  pointageFixture,
} from '@test/unit/fixtures/gestion/anomalies-de-pointage/DossierAnomalie.fixture';
import { describe, expect, it } from 'vitest';
import { DossierAnomalie, PointageAnomalie } from '../../domain/dossier/DossierAnomalie';
import { PerimetreDuDossier } from '../../domain/dossier/PerimetreDuDossier';
import { jourDeLaJournee } from './JourneeDeLOperateur';

const UN_INSTANT_ILLISIBLE = 'pas un instant';

const pointageTardifFixture = (id: string, instant: Date | string): PointageAnomalie =>
  pointageFixture(id, faitFixture(ARRET_FIXTURE, typeof instant === 'string' ? instant : instant.toISOString()));

const dossierAvecDesPointagesTardifsFixture = (...tardifs: readonly PointageAnomalie[]): DossierAnomalie => {
  const ouvrant = pointageFixture(
    'debut-travail-8',
    faitFixture({ type: 'DEBUT', intention: 'OUVERTURE' }, instantDuJourFixture('08:00'), { activiteVisee: '' }),
  );
  const journal = [ouvrant, ...tardifs];
  return dossierDeFinAutomatiqueFixture({
    journal,
    perimetre: new PerimetreDuDossier(journal.map(pointage => pointage.id)),
    choix: tardifs.map(tardif => correctionTardiveFixture('CORRIGER_FIN_TARDIVE', tardif.id.pointage, tardif.fait)),
  });
};

describe('Day of the operator the link of the frise leads to', () => {
  it('should be the day the period of an automatic end starts when no pointage was pointed after the deadline', () => {
    expect(jourDeLaJournee(dossierAvecDesPointagesTardifsFixture())).toBe('2026-09-14');
  });

  it('should be the day of the pointage pointed after the deadline when it falls on the following day', () => {
    const dossier = dossierAvecDesPointagesTardifsFixture(pointageTardifFixture('fin-15', new Date(2026, 8, 15, 10, 0)));

    expect(jourDeLaJournee(dossier)).toBe('2026-09-15');
  });

  it('should be the day of the oldest pointage pointed after the deadline', () => {
    const dossier = dossierAvecDesPointagesTardifsFixture(
      pointageTardifFixture('fin-16', new Date(2026, 8, 16, 10, 0)),
      pointageTardifFixture('fin-15', new Date(2026, 8, 15, 10, 0)),
    );

    expect(jourDeLaJournee(dossier)).toBe('2026-09-15');
  });

  it('should tell the day of a pointage pointed after the deadline by the local clock near midnight', () => {
    const dossier = dossierAvecDesPointagesTardifsFixture(pointageTardifFixture('fin-23', new Date(2026, 8, 14, 23, 50)));

    expect(jourDeLaJournee(dossier)).toBe('2026-09-14');
  });

  it('should be the day of the readable pointage pointed after the deadline when another one has no readable instant', () => {
    const dossier = dossierAvecDesPointagesTardifsFixture(
      pointageTardifFixture('fin-16', new Date(2026, 8, 16, 10, 0)),
      pointageTardifFixture('fin-15', UN_INSTANT_ILLISIBLE),
    );

    expect(jourDeLaJournee(dossier)).toBe('2026-09-16');
  });

  it('should be the day the period starts when the only pointage pointed after the deadline has no readable instant', () => {
    const dossier = dossierAvecDesPointagesTardifsFixture(pointageTardifFixture('fin-15', UN_INSTANT_ILLISIBLE));

    expect(jourDeLaJournee(dossier)).toBe('2026-09-14');
  });

  it('should be the day the period starts when the pointage pointed after the deadline is not in the journal', () => {
    const tardif = pointageTardifFixture('fin-15', new Date(2026, 8, 15, 10, 0));
    const dossier = { ...dossierAvecDesPointagesTardifsFixture(tardif), journal: [] };

    expect(jourDeLaJournee(dossier)).toBe('2026-09-14');
  });

  it('should tell the day the period starts by the local clock near midnight', () => {
    const dossier = dossierDeFinAutomatiqueFixture({
      activites: [activiteEchueFixture('travail-8', 'TRAVAIL', '23:50', '23:55')],
    });

    expect(jourDeLaJournee(dossier)).toBe('2026-09-14');
  });

  it('should be none when the anomaly shows no pointage and no activity to tell the day from', () => {
    expect(jourDeLaJournee(dossierDeFinAutomatiqueFixture({ activites: [] }))).toBeUndefined();
  });
});
