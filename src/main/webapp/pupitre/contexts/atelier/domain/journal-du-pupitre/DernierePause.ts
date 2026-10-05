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

export const lastGesturesOfEachOperator = (evenements: readonly EvenementDuJournal[]): ReadonlyMap<string, GesteDePointage> =>
  new Map(evenements.map(({ geste }) => [geste.operateurId, geste]));

export const suspensionsOfTheLastPause = (
  evenements: readonly EvenementDuJournal[],
  operateurId: string,
): readonly SuspensionJournalisee[] => {
  const derniere = pauseOf(lastGesturesOfEachOperator(evenements).get(operateurId));
  return suspensionsOf(evenements).filter(({ geste }) => geste.suspension.pause === derniere);
};
