import { ActiviteAnomalieId } from '../dossier/ActiviteAnomalieId';
import { SaisieDeRegularisation } from './SaisieDeRegularisation';

const ACTIVITE = new ActiviteAnomalieId('travail-8');
const FIN = '2026-09-14T17:00:00-03:00';

const identifiants = (...suivants: readonly string[]): (() => string) => {
  const restants = [...suivants];
  return () => restants.shift() ?? 'epuises';
};

describe('Entry of the regularisation of an end', () => {
  it('should take a new identifier when no entry precedes it', () => {
    const saisie = SaisieDeRegularisation.pour(undefined, ACTIVITE, FIN, identifiants('saisie-1'));

    expect(saisie.id).toBe('saisie-1');
  });

  it('should keep the identifier of the entry it is sent again with, whatever the spelling of the hour', () => {
    const premiere = SaisieDeRegularisation.pour(undefined, ACTIVITE, FIN, identifiants('saisie-1'));

    const renvoi = SaisieDeRegularisation.pour(premiere, ACTIVITE, '2026-09-14T20:00:00Z', identifiants('saisie-2'));

    expect(renvoi.id).toBe('saisie-1');
  });

  it('should take a new identifier for another hour, the first request may have succeeded', () => {
    const premiere = SaisieDeRegularisation.pour(undefined, ACTIVITE, FIN, identifiants('saisie-1'));

    const autre = SaisieDeRegularisation.pour(premiere, ACTIVITE, '2026-09-14T16:00:00-03:00', identifiants('saisie-2'));

    expect(autre.id).toBe('saisie-2');
  });

  it('should take a new identifier for another activity', () => {
    const premiere = SaisieDeRegularisation.pour(undefined, ACTIVITE, FIN, identifiants('saisie-1'));

    const autre = SaisieDeRegularisation.pour(premiere, new ActiviteAnomalieId('travail-9'), FIN, identifiants('saisie-2'));

    expect(autre.id).toBe('saisie-2');
  });

  it('should send the activity and the hour it was taken with', () => {
    const saisie = SaisieDeRegularisation.pour(undefined, ACTIVITE, FIN, identifiants('saisie-1'));

    expect([saisie.activite, saisie.dateDeSurvenue]).toEqual([ACTIVITE, FIN]);
  });
});
