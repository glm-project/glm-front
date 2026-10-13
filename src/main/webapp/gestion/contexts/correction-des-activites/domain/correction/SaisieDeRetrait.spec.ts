import { ActiviteDeLaJournee, ActiviteTerminee } from '../journee/ActiviteDeLaJournee';
import { ActiviteDeLaJourneeId } from '../journee/ActiviteDeLaJourneeId';
import { CategorieDElement } from '../journee/CategorieDElement';
import { Duree } from '../journee/Duree';
import { ElementDeLaJournee } from '../journee/ElementDeLaJournee';
import { ElementDeLaJourneeId } from '../journee/ElementDeLaJourneeId';
import { InstantDeLaJournee } from '../journee/InstantDeLaJournee';
import { SuiviDAtelierId } from '../journee/SuiviDAtelierId';
import { SaisieDeRetrait } from './SaisieDeRetrait';

const activiteDuSoir = (id: string): ActiviteTerminee => {
  const activite = new ActiviteDeLaJournee({
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
    debut: new InstantDeLaJournee('2026-10-05T18:30:00+02:00'),
    etat: { kind: 'TERMINEE', fin: new InstantDeLaJournee('2026-10-05T21:45:00+02:00'), dureeSurLeJour: new Duree('PT3H15M') },
    autresJours: [],
  });
  if (!activite.estTerminee()) {
    throw new Error('Activité non terminée');
  }
  return activite;
};

describe('Entry of the removal of an activity', () => {
  it('should be given the new identifier when no entry precedes it', () => {
    const saisie = SaisieDeRetrait.pour(undefined, activiteDuSoir('soir'), () => 'saisie-1');

    expect(saisie.id).toBe('saisie-1');
  });

  it('should keep the identifier when the same activity is removed again, the answer to the first request may be lost', () => {
    const premiere = SaisieDeRetrait.pour(undefined, activiteDuSoir('soir'), () => 'saisie-1');

    const renvoi = SaisieDeRetrait.pour(premiere, activiteDuSoir('soir'), () => 'saisie-2');

    expect([renvoi.id, renvoi.suivi.value, renvoi.activite.value]).toEqual(['saisie-1', 'suivi-1', 'soir']);
  });

  it('should give another identifier to the removal of another activity', () => {
    const premiere = SaisieDeRetrait.pour(undefined, activiteDuSoir('soir'), () => 'saisie-1');

    const autre = SaisieDeRetrait.pour(premiere, activiteDuSoir('matin'), () => 'saisie-2');

    expect(autre.id).toBe('saisie-2');
  });

  it('should aim the suivi and the activity removed', () => {
    const saisie = SaisieDeRetrait.pour(undefined, activiteDuSoir('soir'), () => 'saisie-1');

    expect([saisie.suivi.value, saisie.activite.value]).toEqual(['suivi-1', 'soir']);
  });
});
