import {
  dossierDeFinAutomatiqueFixture,
  instantDuJourFixture,
} from '@test/unit/fixtures/gestion/anomalies-de-pointage/DossierAnomalie.fixture';
import { describe, expect, it } from 'vitest';
import { placementDuDossier, poigneeDuDossier } from './PoigneeDeFrise';

const MAINTENANT = instantDuJourFixture('20:00');

const dossier = dossierDeFinAutomatiqueFixture();

describe('Handle of the proposed instant of a dossier', () => {
  it('should stand on the instant of the end the manager proposes, within the start of the activity and the clock', () => {
    const poignee = poigneeDuDossier(dossier, instantDuJourFixture('17:00'), MAINTENANT);

    expect(poignee).toEqual({
      instant: instantDuJourFixture('17:00'),
      bornes: { min: instantDuJourFixture('08:00'), max: MAINTENANT },
    });
  });

  it('should be none for an end with no readable instant', () => {
    expect(poigneeDuDossier(dossier, '', MAINTENANT)).toBeUndefined();
  });
});

describe('Placement of the instant of a dossier', () => {
  it('should be offered for an end the manager proposes without an instant', () => {
    const placement = placementDuDossier(dossier, '', MAINTENANT);

    expect(placement).toEqual({ bornes: { min: instantDuJourFixture('08:00'), max: MAINTENANT } });
  });

  it('should be none for an end that already carries its instant', () => {
    expect(placementDuDossier(dossier, instantDuJourFixture('17:00'), MAINTENANT)).toBeUndefined();
  });
});
