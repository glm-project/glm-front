import { EvenementDuJournal, GesteDAtelier, JournalDuPupitre, ReferentielDuPupitre } from './JournalDuPupitre';

export abstract class JournauxDuPupitrePort {
  abstract read(entreprise: string): Promise<JournalDuPupitre>;
  abstract append(entreprise: string, gestes: GesteDAtelier[]): Promise<void>;
  abstract saveReferentiel(entreprise: string, referentiel: ReferentielDuPupitre): Promise<JournalDuPupitre>;
  abstract saveResult(entreprise: string, resultat: EvenementDuJournal): Promise<JournalDuPupitre>;
  abstract markDisconnected(entreprise: string): Promise<JournalDuPupitre>;
  abstract synchronize<T>(action: () => Promise<T>): Promise<T>;
  abstract withSession<T>(action: () => Promise<T>): Promise<T>;
}
