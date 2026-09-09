import { Entreprise } from './Entreprise';
import { EvenementDuJournal, GesteDAtelier, JournalDuPupitre, ReferentielDuPupitre } from './JournalDuPupitre';

export abstract class JournauxDuPupitrePort {
  abstract read(entreprise: Entreprise): Promise<JournalDuPupitre>;
  abstract append(entreprise: Entreprise, gestes: readonly GesteDAtelier[]): Promise<void>;
  abstract saveReferentiel(entreprise: Entreprise, referentiel: ReferentielDuPupitre): Promise<JournalDuPupitre>;
  abstract saveResult(entreprise: Entreprise, resultat: EvenementDuJournal): Promise<JournalDuPupitre>;
  abstract markDisconnected(entreprise: Entreprise): Promise<JournalDuPupitre>;
  abstract synchronize<T>(action: () => Promise<T>): Promise<T>;
  abstract withSession<T>(action: () => Promise<T>): Promise<T>;
}
