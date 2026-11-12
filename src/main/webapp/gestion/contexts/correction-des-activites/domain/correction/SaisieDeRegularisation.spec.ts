import { ActiviteDeLaJournee, ActiviteTerminee } from '../journee/ActiviteDeLaJournee';
import { ActiviteDeLaJourneeId } from '../journee/ActiviteDeLaJourneeId';
import { CategorieDElement } from '../journee/CategorieDElement';
import { Duree } from '../journee/Duree';
import { ElementDeLaJournee } from '../journee/ElementDeLaJournee';
import { ElementDeLaJourneeId } from '../journee/ElementDeLaJourneeId';
import { InstantDeLaJournee } from '../journee/InstantDeLaJournee';
import { SuiviDAtelierId } from '../journee/SuiviDAtelierId';
import { SaisieDeRegularisation } from './SaisieDeRegularisation';

const activite = (id: string): ActiviteTerminee => {
  const finAutomatique = new ActiviteDeLaJournee({
    id: new ActiviteDeLaJourneeId(id),
    suivi: new SuiviDAtelierId('suivi-1'),
    element: new ElementDeLaJournee({
      id: new ElementDeLaJourneeId('element-1'),
      categorie: new CategorieDElement('OF'),
      nom: 'PRD-2026-000001',
      reference: '24-131',
      description: 'Pièce 1',
    }),
    poste: undefined,
    categorie: 'TRAVAIL',
    debut: new InstantDeLaJournee('2026-10-05T18:30:00-03:00'),
    etat: {
      kind: 'TERMINEE_AUTOMATIQUEMENT',
      fin: new InstantDeLaJournee('2026-10-05T22:30:00-03:00'),
      dureeSurLeJour: new Duree('PT4H'),
    },
    autresJours: [],
  });
  if (!finAutomatique.estTerminee()) {
    throw new Error('Activité non terminée');
  }
  return finAutomatique;
};

const contenu = (saisie: SaisieDeRegularisation): string[] => [saisie.id, saisie.suivi.value, saisie.activite.value, saisie.dateDeSurvenue];

describe('Entry of the regularisation of an automatic end', () => {
  it('should be given the new identifier and aim the suivi, the activity and the end when no entry precedes it', () => {
    const saisie = SaisieDeRegularisation.pour(undefined, activite('soir'), '2026-10-05T21:00:00-03:00', () => 'saisie-1');

    expect(contenu(saisie)).toEqual(['saisie-1', 'suivi-1', 'soir', '2026-10-05T21:00:00-03:00']);
  });

  it('should keep the identifier for the same end written otherwise, the answer to the first request may be lost', () => {
    const premiere = SaisieDeRegularisation.pour(undefined, activite('soir'), '2026-10-05T21:00:00-03:00', () => 'saisie-1');

    const renvoi = SaisieDeRegularisation.pour(premiere, activite('soir'), '2026-10-06T00:00:00Z', () => 'saisie-2');

    expect(renvoi).toBe(premiere);
  });

  it.each([
    { cas: 'another end of the same activity', id: 'soir', fin: '2026-10-05T21:01:00-03:00' },
    { cas: 'the same end of another activity', id: 'nuit', fin: '2026-10-05T21:00:00-03:00' },
  ])('should give another identifier to $cas', ({ id, fin }) => {
    const premiere = SaisieDeRegularisation.pour(undefined, activite('soir'), '2026-10-05T21:00:00-03:00', () => 'saisie-1');

    const autre = SaisieDeRegularisation.pour(premiere, activite(id), fin, () => 'saisie-2');

    expect(contenu(autre)).toEqual(['saisie-2', 'suivi-1', id, fin]);
  });
});
