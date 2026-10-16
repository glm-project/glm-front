import { InstantDeLaJournee } from '../../domain/journee/InstantDeLaJournee';

export const maintenant = (): InstantDeLaJournee => new InstantDeLaJournee(new Date().toISOString());
