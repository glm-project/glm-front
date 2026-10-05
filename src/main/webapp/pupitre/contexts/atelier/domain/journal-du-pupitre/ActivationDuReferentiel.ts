import { lastGesturesOfEachOperator, suspensionsOfTheLastPause } from './DernierePause';
import { EvenementDuJournal, JournalDuPupitre, ReferentielDuPupitre } from './JournalDuPupitre';

const idsReadByThePause = (evenements: readonly EvenementDuJournal[]): ReadonlySet<string> => {
  const derniers = lastGesturesOfEachOperator(evenements);
  const suspensions = [...derniers.keys()].flatMap(operateurId => suspensionsOfTheLastPause(evenements, operateurId));
  return new Set([...[...derniers.values()].map(({ id }) => id), ...suspensions.map(({ geste }) => geste.id)]);
};

const isForgotten = (evenement: EvenementDuJournal, retained: ReadonlySet<string>): boolean =>
  evenement.etat === 'ACCEPTE' && !retained.has(evenement.geste.id);

const acceptedIdsOf = (evenements: readonly EvenementDuJournal[], suiviId: string): readonly string[] =>
  evenements.filter(({ etat, geste }) => etat === 'ACCEPTE' && geste.suiviId === suiviId).map(({ geste }) => geste.id);

const pausesCarriedBy = (evenements: readonly EvenementDuJournal[]): ReadonlySet<string | undefined> =>
  new Set(evenements.map(({ geste }) => geste.suspension?.pause));

export const afterActivatingReferentiel = (journal: JournalDuPupitre, referentiel: ReferentielDuPupitre): JournalDuPupitre => {
  const retained = idsReadByThePause(journal.evenements);
  const evenements = journal.evenements.filter(evenement => !isForgotten(evenement, retained));
  const pauses = pausesCarriedBy(evenements);
  return {
    ...journal,
    evenements,
    ...(journal.pausesArretees === undefined ? {} : { pausesArretees: journal.pausesArretees.filter(pause => pauses.has(pause)) }),
    referentiel: {
      ...referentiel,
      suivis: referentiel.suivis.map(suivi => ({
        ...suivi,
        evenements: [...new Set([...suivi.evenements, ...acceptedIdsOf(evenements, suivi.id)])],
      })),
    },
  };
};
