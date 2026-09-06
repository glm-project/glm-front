import { LocalEvent, LocalGeste, LocalPupitreState, ReferentielDuPupitre } from './LocalPupitreState';

export abstract class PupitreJournalPort {
  abstract read(entreprise: string): Promise<LocalPupitreState>;
  abstract append(entreprise: string, gestes: LocalGeste[]): Promise<void>;
  abstract saveReferentiel(entreprise: string, referentiel: ReferentielDuPupitre): Promise<LocalPupitreState>;
  abstract saveResult(entreprise: string, resultat: LocalEvent): Promise<LocalPupitreState>;
  abstract markDisconnected(entreprise: string): Promise<LocalPupitreState>;
  abstract synchronize<T>(action: () => Promise<T>): Promise<T>;
  abstract withSession<T>(action: () => Promise<T>): Promise<T>;
}
