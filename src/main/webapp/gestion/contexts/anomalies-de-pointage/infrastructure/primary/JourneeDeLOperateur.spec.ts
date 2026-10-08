import {
  activiteEchueFixture,
  dossierDeFinAutomatiqueFixture,
} from '@test/unit/fixtures/gestion/anomalies-de-pointage/DossierAnomalie.fixture';
import { describe, expect, it } from 'vitest';
import { jourDeLaJournee } from './JourneeDeLOperateur';

describe('Day of the operator the link of the frise leads to', () => {
  it('should be the day the period of an automatic end starts', () => {
    expect(jourDeLaJournee(dossierDeFinAutomatiqueFixture())).toBe('2026-09-14');
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
