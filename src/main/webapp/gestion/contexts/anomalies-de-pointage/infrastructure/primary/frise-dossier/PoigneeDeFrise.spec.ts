import {
  ARRET_FIXTURE,
  dossierDeFinAutomatiqueFixture,
  faitFixture,
  instantDuJourFixture,
} from '@test/unit/fixtures/gestion/anomalies-de-pointage/DossierAnomalie.fixture';
import { describe, expect, it } from 'vitest';
import { FaitPropose } from '../../../domain/acte/ActeResolution';
import { PropositionActe } from '../../../domain/acte/SaisieActe';
import { placementDuDossier, poigneeDuDossier } from './PoigneeDeFrise';

const MAINTENANT = instantDuJourFixture('20:00');
const OUVERTURE = { type: 'DEBUT', intention: 'OUVERTURE' } as const;

const dossier = dossierDeFinAutomatiqueFixture();

const regularisation = (changement: Partial<FaitPropose> = {}): PropositionActe => ({
  kind: 'REGULARISATION',
  fait: faitFixture(ARRET_FIXTURE, instantDuJourFixture('17:00'), changement),
});

describe('Handle of the proposed instant of a dossier', () => {
  it('should stand on the instant of an end the manager proposes, within the start of the activity and the clock', () => {
    const poignee = poigneeDuDossier(dossier, regularisation(), MAINTENANT, false);

    expect(poignee).toEqual({
      instant: instantDuJourFixture('17:00'),
      activiteVisee: 'travail-8',
      bornes: { min: instantDuJourFixture('08:00'), max: MAINTENANT },
      desactivee: false,
    });
  });

  it('should be locked when the input is', () => {
    expect(poigneeDuDossier(dossier, regularisation(), MAINTENANT, true)?.desactivee).toBe(true);
  });

  it.each<{ cas: string; proposition: PropositionActe | undefined }>([
    { cas: 'no proposition', proposition: undefined },
    { cas: 'a cancellation', proposition: { kind: 'ANNULATION', pointage: 'fin-17', motif: '' } },
    {
      cas: 'a fact that ends no activity',
      proposition: { kind: 'REGULARISATION', fait: faitFixture(OUVERTURE, '', { activiteVisee: '' }) },
    },
    { cas: 'an end with no readable instant', proposition: regularisation({ instant: '' }) },
    { cas: 'an end aiming at an activity the dossier does not hold', proposition: regularisation({ activiteVisee: 'travail-absent' }) },
  ])('should be none for $cas', ({ proposition }) => {
    expect(poigneeDuDossier(dossier, proposition, MAINTENANT, false)).toBeUndefined();
  });
});

describe('Placement of the instant of a dossier', () => {
  it('should be offered for an end the manager proposes without an instant', () => {
    const placement = placementDuDossier(dossier, regularisation({ instant: '' }), MAINTENANT, false);

    expect(placement).toEqual({
      activiteVisee: 'travail-8',
      bornes: { min: instantDuJourFixture('08:00'), max: MAINTENANT },
      desactivee: false,
    });
  });

  it.each<{ cas: string; proposition: PropositionActe | undefined }>([
    { cas: 'no proposition', proposition: undefined },
    { cas: 'a cancellation', proposition: { kind: 'ANNULATION', pointage: 'fin-17', motif: '' } },
    { cas: 'an end that already carries its instant', proposition: regularisation() },
    {
      cas: 'an end aiming at an activity the dossier does not hold',
      proposition: regularisation({ instant: '', activiteVisee: 'travail-absent' }),
    },
  ])('should be none for $cas', ({ proposition }) => {
    expect(placementDuDossier(dossier, proposition, MAINTENANT, false)).toBeUndefined();
  });
});
