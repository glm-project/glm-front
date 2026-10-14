import { ActiviteDeLaJournee, ActiviteTerminee } from '../journee/ActiviteDeLaJournee';
import { ActiviteDeLaJourneeId } from '../journee/ActiviteDeLaJourneeId';
import { CategorieDElement } from '../journee/CategorieDElement';
import { Duree } from '../journee/Duree';
import { ElementDeLaJournee } from '../journee/ElementDeLaJournee';
import { ElementDeLaJourneeId } from '../journee/ElementDeLaJourneeId';
import { InstantDeLaJournee } from '../journee/InstantDeLaJournee';
import { PosteDeLaJournee } from '../journee/PosteDeLaJournee';
import { PosteDeLaJourneeId } from '../journee/PosteDeLaJourneeId';
import { SuiviDAtelierId } from '../journee/SuiviDAtelierId';
import { SaisieDeChangementDePoste } from './SaisieDeChangementDePoste';

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

const poste = (id: string): PosteDeLaJournee => new PosteDeLaJournee(new PosteDeLaJourneeId(id), `Poste ${id}`, 'Tournage');

const contenu = (saisie: SaisieDeChangementDePoste): string[] => [saisie.id, saisie.suivi.value, saisie.activite.value, saisie.poste.value];

describe('Entry of the change of workstation of an activity', () => {
  it('should be given the new identifier and aim the suivi, the activity and the workstation when no entry precedes it', () => {
    const saisie = SaisieDeChangementDePoste.pour(undefined, activiteDuSoir('soir'), poste('tour'), () => 'saisie-1');

    expect(contenu(saisie)).toEqual(['saisie-1', 'suivi-1', 'soir', 'tour']);
  });

  it('should keep the identifier when the same workstation is chosen again, the answer to the first request may be lost', () => {
    const premiere = SaisieDeChangementDePoste.pour(undefined, activiteDuSoir('soir'), poste('tour'), () => 'saisie-1');

    const renvoi = SaisieDeChangementDePoste.pour(premiere, activiteDuSoir('soir'), poste('tour'), () => 'saisie-2');

    expect(contenu(renvoi)).toEqual(['saisie-1', 'suivi-1', 'soir', 'tour']);
  });

  it('should give another identifier to another workstation chosen for the same activity', () => {
    const premiere = SaisieDeChangementDePoste.pour(undefined, activiteDuSoir('soir'), poste('tour'), () => 'saisie-1');

    const autre = SaisieDeChangementDePoste.pour(premiere, activiteDuSoir('soir'), poste('fraise'), () => 'saisie-2');

    expect(contenu(autre)).toEqual(['saisie-2', 'suivi-1', 'soir', 'fraise']);
  });

  it('should give another identifier to the same workstation chosen for another activity', () => {
    const premiere = SaisieDeChangementDePoste.pour(undefined, activiteDuSoir('soir'), poste('tour'), () => 'saisie-1');

    const autre = SaisieDeChangementDePoste.pour(premiere, activiteDuSoir('matin'), poste('tour'), () => 'saisie-2');

    expect(contenu(autre)).toEqual(['saisie-2', 'suivi-1', 'matin', 'tour']);
  });
});
