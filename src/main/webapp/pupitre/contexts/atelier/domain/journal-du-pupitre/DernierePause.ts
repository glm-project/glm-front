import { EvenementDuJournal, GesteDePointage, Suspension } from './JournalDuPupitre';

export type GesteSuspendu = GesteDePointage & { readonly suspension: Suspension };

export interface SuspensionJournalisee {
  readonly geste: GesteSuspendu;
  readonly refusee: boolean;
}

const isSuspension = (geste: GesteDePointage): geste is GesteSuspendu => geste.suspension !== undefined;

const suspensionsOf = (evenements: readonly EvenementDuJournal[]): readonly SuspensionJournalisee[] =>
  evenements.flatMap(({ geste, etat }) => (isSuspension(geste) ? [{ geste, refusee: etat === 'REFUSE' }] : []));

const pauseOf = (geste: GesteDePointage | undefined): string | undefined =>
  geste?.nature === 'POINTAGE' ? geste.suspension?.pause : undefined;

const lastGestureOf = (evenements: readonly EvenementDuJournal[], operateurId: string): GesteDePointage | undefined =>
  evenements.filter(({ geste }) => geste.operateurId === operateurId).at(-1)?.geste;

export const suspensionsOfTheLastPause = (
  evenements: readonly EvenementDuJournal[],
  operateurId: string,
): readonly SuspensionJournalisee[] => {
  const derniere = pauseOf(lastGestureOf(evenements, operateurId));
  return suspensionsOf(evenements).filter(({ geste }) => geste.suspension.pause === derniere);
};
