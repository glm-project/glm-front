import { ActiviteDeLaJournee, ActiviteTerminee } from '../journee/ActiviteDeLaJournee';
import { ActiviteDeLaJourneeId } from '../journee/ActiviteDeLaJourneeId';
import { BornesDuJour } from '../journee/BornesDuJour';
import { CategorieDElement } from '../journee/CategorieDElement';
import { ChoixDAjout } from '../journee/ChoixDAjout';
import { Duree } from '../journee/Duree';
import { ElementDeLaJournee } from '../journee/ElementDeLaJournee';
import { ElementDeLaJourneeId } from '../journee/ElementDeLaJourneeId';
import { InstantDeLaJournee } from '../journee/InstantDeLaJournee';
import { JourACorriger } from '../journee/JourACorriger';
import { JourneeACorriger } from '../journee/JourneeACorriger';
import { OperateurDeLaJournee } from '../journee/OperateurDeLaJournee';
import { OperateurDeLaJourneeId } from '../journee/OperateurDeLaJourneeId';
import { PortionDeJour } from '../journee/PortionDeJour';
import { SuiviDAtelierId } from '../journee/SuiviDAtelierId';
import { SuiviPresent } from '../journee/SuiviPresent';
import { SuivisPresents } from '../journee/SuivisPresents';
import { EffetSurLesJournees } from './EffetSurLesJournees';

const instant = (recu: string): InstantDeLaJournee => new InstantDeLaJournee(recu);

const ELEMENT = new ElementDeLaJournee({
  id: new ElementDeLaJourneeId('element-1'),
  categorie: new CategorieDElement('OF'),
  nom: 'PRD-2026-000001',
  reference: '24-131',
  description: 'Pièce 1',
});

const SUIVI = new SuiviDAtelierId('suivi-1');

const activite = (debut: string, fin: string, portionDuJour: string, autresJours: readonly PortionDeJour[] = []): ActiviteDeLaJournee =>
  new ActiviteDeLaJournee({
    id: new ActiviteDeLaJourneeId('activite-1'),
    suivi: SUIVI,
    element: ELEMENT,
    poste: undefined,
    categorie: 'TRAVAIL',
    debut: instant(debut),
    etat: { kind: 'TERMINEE', fin: instant(fin), dureeSurLeJour: new Duree(portionDuJour) },
    autresJours,
  });

const lundi = (activites: readonly ActiviteDeLaJournee[], operationnelle: string): JourneeACorriger =>
  new JourneeACorriger({
    operateur: new OperateurDeLaJournee(new OperateurDeLaJourneeId('op-1'), 'Leroy', 'Hugo'),
    jour: new JourACorriger('2026-10-05'),
    bornes: new BornesDuJour({ debut: instant('2026-10-05T00:00:00+02:00'), fin: instant('2026-10-06T00:00:00+02:00') }),
    dureeOperationnelle: new Duree(operationnelle),
    activites,
    choix: new ChoixDAjout({
      suivis: new SuivisPresents([
        new SuiviPresent({ suivi: SUIVI, element: ELEMENT, engageLe: instant('2026-10-01T08:00:00+02:00'), clotureLe: undefined }),
      ]),
      postes: [],
    }),
  });

const retrouvee = (journee: JourneeACorriger): ActiviteTerminee => {
  const [premiere] = journee.activites;
  if (premiere?.estTerminee() !== true) {
    throw new Error('Aucune activité terminée semée');
  }
  return premiere;
};

describe('Effect of the removal of an activity on the days', () => {
  it('should take the portion of the activity off the operational duration of the day displayed', () => {
    const journee = lundi([activite('2026-10-05T18:30:00+02:00', '2026-10-05T21:45:00+02:00', 'PT3H15M')], 'PT7H30M');

    const effet = whenRemovingTheActivity(journee);

    expect(effet.jourAffiche).toEqual({ jour: new JourACorriger('2026-10-05'), avant: new Duree('PT7H30M'), apres: new Duree('PT4H15M') });
    expect(effet.autresJours).toEqual([]);
  });

  it('should take the portion of the day displayed off the day displayed and the other portions off the other days', () => {
    const dimancheSoirAuLundi = activite('2026-10-04T22:00:00+02:00', '2026-10-05T03:00:00+02:00', 'PT3H', [
      new PortionDeJour(new JourACorriger('2026-10-04'), new Duree('PT2H')),
    ]);
    const journee = lundi([dimancheSoirAuLundi], 'PT7H30M');

    const effet = whenRemovingTheActivity(journee);

    expect(effet.jourAffiche).toEqual({ jour: new JourACorriger('2026-10-05'), avant: new Duree('PT7H30M'), apres: new Duree('PT4H30M') });
    expect(effet.autresJours).toEqual([{ jour: new JourACorriger('2026-10-04'), retire: new Duree('PT2H') }]);
  });

  const whenRemovingTheActivity = (journee: JourneeACorriger): EffetSurLesJournees =>
    EffetSurLesJournees.duRetrait(journee, retrouvee(journee));
});
