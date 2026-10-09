import {
  dossierDeFinAutomatiqueFixture,
  instantDuJourFixture,
} from '@test/unit/fixtures/gestion/anomalies-de-pointage/DossierAnomalie.fixture';
import { describe, expect, it } from 'vitest';
import { FinProposee, placementDuDossier, poigneeDuDossier } from './PoigneeDeFrise';

const MAINTENANT = instantDuJourFixture('20:00');

const dossier = dossierDeFinAutomatiqueFixture();

const fin = (changement: Partial<FinProposee> = {}): FinProposee => ({
  activiteVisee: 'travail-8',
  instant: instantDuJourFixture('17:00'),
  ...changement,
});

describe('Handle of the proposed instant of a dossier', () => {
  it('should stand on the instant of the end the manager proposes, within the start of the activity and the clock', () => {
    const poignee = poigneeDuDossier(dossier, fin(), MAINTENANT);

    expect(poignee).toEqual({
      instant: instantDuJourFixture('17:00'),
      activiteVisee: 'travail-8',
      bornes: { min: instantDuJourFixture('08:00'), max: MAINTENANT },
    });
  });

  it.each<{ cas: string; proposee: FinProposee }>([
    { cas: 'an end with no readable instant', proposee: fin({ instant: '' }) },
    { cas: 'an end aiming at an activity the dossier does not hold', proposee: fin({ activiteVisee: 'travail-absent' }) },
  ])('should be none for $cas', ({ proposee }) => {
    expect(poigneeDuDossier(dossier, proposee, MAINTENANT)).toBeUndefined();
  });
});

describe('Placement of the instant of a dossier', () => {
  it('should be offered for an end the manager proposes without an instant', () => {
    const placement = placementDuDossier(dossier, fin({ instant: '' }), MAINTENANT);

    expect(placement).toEqual({
      activiteVisee: 'travail-8',
      bornes: { min: instantDuJourFixture('08:00'), max: MAINTENANT },
    });
  });

  it.each<{ cas: string; proposee: FinProposee }>([
    { cas: 'an end that already carries its instant', proposee: fin() },
    { cas: 'an end aiming at an activity the dossier does not hold', proposee: fin({ instant: '', activiteVisee: 'travail-absent' }) },
  ])('should be none for $cas', ({ proposee }) => {
    expect(placementDuDossier(dossier, proposee, MAINTENANT)).toBeUndefined();
  });
});
