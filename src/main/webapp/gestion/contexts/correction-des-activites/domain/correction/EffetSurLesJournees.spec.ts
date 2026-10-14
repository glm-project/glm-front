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
import { CalendrierLocal } from './CalendrierLocal';
import { EffetSurLesJournees } from './EffetSurLesJournees';
import { PlageDAjout } from './PlageDAjout';

const instant = (recu: string): InstantDeLaJournee => new InstantDeLaJournee(recu);

const deuxChiffres = (valeur: number): string => String(valeur).padStart(2, '0');

const decalageDuJour = (jour: JourACorriger): string => (jour.value >= '2026-10-25' ? '+01:00' : '+02:00');

const CALENDRIER: CalendrierLocal = {
  instantA: (jour, heures, minutes) => instant(`${jour.value}T${deuxChiffres(heures)}:${deuxChiffres(minutes)}:00${decalageDuJour(jour)}`),
};

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

const journeeAvec = (
  jour: string,
  bornes: BornesDuJour,
  activites: readonly ActiviteDeLaJournee[],
  operationnelle: string,
): JourneeACorriger =>
  new JourneeACorriger({
    operateur: new OperateurDeLaJournee(new OperateurDeLaJourneeId('op-1'), 'Leroy', 'Hugo'),
    jour: new JourACorriger(jour),
    bornes,
    dureeOperationnelle: new Duree(operationnelle),
    activites,
    choix: new ChoixDAjout({
      suivis: new SuivisPresents([
        new SuiviPresent({ suivi: SUIVI, element: ELEMENT, engageLe: instant('2026-10-01T08:00:00+02:00'), clotureLe: undefined }),
      ]),
      postes: [],
    }),
  });

const lundi = (activites: readonly ActiviteDeLaJournee[], operationnelle: string): JourneeACorriger =>
  journeeAvec(
    '2026-10-05',
    new BornesDuJour({
      debut: instant('2026-10-05T00:00:00+02:00'),
      fin: instant('2026-10-06T00:00:00+02:00'),
      finDuLendemain: instant('2026-10-07T00:00:00+02:00'),
    }),
    activites,
    operationnelle,
  );

const samediDuChangementDHeure = (operationnelle: string): JourneeACorriger =>
  journeeAvec(
    '2026-10-24',
    new BornesDuJour({
      debut: instant('2026-10-24T00:00:00+02:00'),
      fin: instant('2026-10-25T00:00:00+02:00'),
      finDuLendemain: instant('2026-10-26T00:00:00+01:00'),
    }),
    [],
    operationnelle,
  );

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
    expect(effet.autresJoursRetires).toEqual([]);
  });

  it('should take the portion of the day displayed off the day displayed and the other portions off the other days', () => {
    const dimancheSoirAuLundi = activite('2026-10-04T22:00:00+02:00', '2026-10-05T03:00:00+02:00', 'PT3H', [
      new PortionDeJour(new JourACorriger('2026-10-04'), new Duree('PT2H')),
    ]);
    const journee = lundi([dimancheSoirAuLundi], 'PT7H30M');

    const effet = whenRemovingTheActivity(journee);

    expect(effet.jourAffiche).toEqual({ jour: new JourACorriger('2026-10-05'), avant: new Duree('PT7H30M'), apres: new Duree('PT4H30M') });
    expect(effet.autresJoursRetires).toEqual([{ jour: new JourACorriger('2026-10-04'), retire: new Duree('PT2H') }]);
  });

  const whenRemovingTheActivity = (journee: JourneeACorriger): EffetSurLesJournees =>
    EffetSurLesJournees.duRetrait(journee, retrouvee(journee));
});

describe('Effect of the addition of an activity on the days', () => {
  it('should add the duration of the range to the operational duration of the day displayed and touch no other day', () => {
    const journee = lundi([], 'PT7H30M');

    const effet = whenAddingOnTheRange(journee, '08:00', '10:30');

    expect(effet?.jourAffiche).toEqual({ jour: new JourACorriger('2026-10-05'), avant: new Duree('PT7H30M'), apres: new Duree('PT10H') });
    expect(effet?.autresJoursRetires).toEqual([]);
  });

  it.each([
    { cas: 'nothing is typed', debut: '', fin: '' },
    { cas: 'the end is missing', debut: '08:00', fin: '' },
    { cas: 'the end does not follow the start', debut: '08:00', fin: '08:00' },
    { cas: 'an hour is badly written', debut: '25:00', fin: '10:00' },
  ])('should forecast nothing when $cas', ({ debut, fin }) => {
    expect(whenAddingOnTheRange(lundi([], 'PT7H30M'), debut, fin)).toBeUndefined();
  });

  it('should announce each day an addition ending the next day touches: the portion of the day displayed added to its total, the other day on its own', () => {
    const effet = whenAddingOnTheRange(lundi([], 'PT7H30M'), '22:00', '03:30', 'LENDEMAIN');

    expect(effet?.jourAffiche).toEqual({ jour: new JourACorriger('2026-10-05'), avant: new Duree('PT7H30M'), apres: new Duree('PT9H30M') });
    expect(effet?.autresJoursAjoutes).toEqual([{ jour: new JourACorriger('2026-10-06'), ajoute: new Duree('PT3H30M') }]);
    expect(effet?.autresJoursRetires).toEqual([]);
  });

  it('should touch no other day when the addition ends the next day exactly at midnight', () => {
    const effet = whenAddingOnTheRange(lundi([], 'PT7H30M'), '22:00', '00:00', 'LENDEMAIN');

    expect(effet?.jourAffiche.apres).toEqual(new Duree('PT9H30M'));
    expect(effet?.autresJoursAjoutes).toEqual([]);
  });

  it('should count the real duration of the night the clocks change: 2 h on the Saturday and 4 h 30 on the Sunday', () => {
    const effet = whenAddingOnTheRange(samediDuChangementDHeure('PT1H'), '22:00', '03:30', 'LENDEMAIN');

    expect(effet?.jourAffiche).toEqual({ jour: new JourACorriger('2026-10-24'), avant: new Duree('PT1H'), apres: new Duree('PT3H') });
    expect(effet?.autresJoursAjoutes).toEqual([{ jour: new JourACorriger('2026-10-25'), ajoute: new Duree('PT4H30M') }]);
  });

  it('should forecast nothing for an end past the end of the next day rather than credit the next day with the whole remainder', () => {
    const finissantAvantQuatreHeures = journeeAvec(
      '2026-10-05',
      new BornesDuJour({
        debut: instant('2026-10-05T00:00:00+02:00'),
        fin: instant('2026-10-06T00:00:00+02:00'),
        finDuLendemain: instant('2026-10-06T03:00:00+02:00'),
      }),
      [],
      'PT7H30M',
    );

    expect(whenAddingOnTheRange(finissantAvantQuatreHeures, '22:00', '04:00', 'LENDEMAIN')).toBeUndefined();
  });

  type JourDeLaFin = 'JOUR_AFFICHE' | 'LENDEMAIN';

  const whenAddingOnTheRange = (
    journee: JourneeACorriger,
    debut: string,
    fin: string,
    jourDeLaFin: JourDeLaFin = 'JOUR_AFFICHE',
  ): EffetSurLesJournees | undefined => {
    const saisie = PlageDAjout.pour(journee.bornes, journee.jour, instant('2026-10-27T12:00:00+01:00'), CALENDRIER)
      .avecDebut(debut)
      .avecFin(fin);
    return EffetSurLesJournees.dUnAjout(journee, jourDeLaFin === 'LENDEMAIN' ? saisie.avecFinLeLendemain() : saisie);
  };
});
