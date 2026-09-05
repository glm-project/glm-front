import { EvenementLocal, GesteLocal, PupitreLocal, ReferentielDuPupitre } from './PupitreLocal';

export abstract class JournalDuPupitrePort {
  abstract read(entreprise: string): Promise<PupitreLocal>;
  abstract append(entreprise: string, gestes: GesteLocal[]): Promise<void>;
  abstract saveReferentiel(entreprise: string, referentiel: ReferentielDuPupitre): Promise<PupitreLocal>;
  abstract saveResult(entreprise: string, resultat: EvenementLocal): Promise<PupitreLocal>;
  abstract markDisconnected(entreprise: string): Promise<PupitreLocal>;
  abstract synchronize<T>(action: () => Promise<T>): Promise<T>;
  abstract withSession<T>(action: () => Promise<T>): Promise<T>;
}
