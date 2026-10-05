import {
  EvenementsDuJournal,
  JournalDuPupitre,
  ReferentielDuPupitre,
} from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';

export const afterActivatingReferentiel = (journal: JournalDuPupitre, referentiel: ReferentielDuPupitre): JournalDuPupitre => {
  const evenements = new EvenementsDuJournal(journal.evenements);
  return {
    ...journal,
    referentiel: {
      ...referentiel,
      suivis: referentiel.suivis.map(suivi => ({
        ...suivi,
        evenements: [...new Set([...suivi.evenements, ...evenements.acceptedPointageIds(suivi.id)])],
      })),
    },
  };
};
