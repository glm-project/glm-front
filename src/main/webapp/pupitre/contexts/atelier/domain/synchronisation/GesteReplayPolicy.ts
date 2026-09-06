import { EvenementDuJournal, GesteDAtelier } from '../journal-du-pupitre/JournalDuPupitre';
import { RefusDAtelier } from '../refus/RefusDAtelier';
import { RefusDePublication } from '../refus/RefusDePublication';

export type OperationDAtelier = 'ARRIVEE_ASSUREE' | 'PRESENCE_ASSUREE' | 'REPRISE_APRES_ARRIVEE_OUVERTE' | 'GESTE_EXPLICITE';
export type ReplayDecision = 'ACCEPTER' | 'RELIRE_ET_REJOUER' | 'PROPAGER';

const matches = (refus: unknown, code: string): boolean => {
  if (refus instanceof RefusDAtelier) {
    return refus.code === code;
  }
  return refus instanceof RefusDePublication && refus.motif === code;
};

const absorbsForbiddenPresenceTransition = (operation: OperationDAtelier): boolean =>
  operation === 'PRESENCE_ASSUREE' || operation === 'REPRISE_APRES_ARRIVEE_OUVERTE';

const arrivalActuallyOpened = (evenements: readonly EvenementDuJournal[], arriveeId: string, operateurId: string): boolean =>
  evenements.some(
    evenement =>
      evenement.geste.id === arriveeId
      && evenement.geste.operateurId === operateurId
      && 'journeeOuverte' in evenement
      && evenement.journeeOuverte,
  );

export const operationFor = (geste: GesteDAtelier, evenements: readonly EvenementDuJournal[] = []): OperationDAtelier => {
  if (geste.nature === 'ARRIVEE') {
    return 'ARRIVEE_ASSUREE';
  }
  if (geste.nature !== 'PRESENCE') {
    return 'GESTE_EXPLICITE';
  }
  if (geste.implicite) {
    return 'PRESENCE_ASSUREE';
  }
  if (geste.assuranceArriveeId !== undefined && arrivalActuallyOpened(evenements, geste.assuranceArriveeId, geste.operateurId)) {
    return 'REPRISE_APRES_ARRIVEE_OUVERTE';
  }
  return 'GESTE_EXPLICITE';
};

export const decideReplay = (
  operation: OperationDAtelier,
  refus: unknown,
  tentative: 'INITIALE' | 'REJEU' = 'INITIALE',
): ReplayDecision => {
  if (matches(refus, 'saisie-concurrente') && tentative === 'INITIALE') {
    return 'RELIRE_ET_REJOUER';
  }
  if (operation === 'ARRIVEE_ASSUREE' && matches(refus, 'journee-de-travail-deja-ouverte')) {
    return 'ACCEPTER';
  }
  if (absorbsForbiddenPresenceTransition(operation) && matches(refus, 'transition-de-presence-interdite')) {
    return 'ACCEPTER';
  }
  return 'PROPAGER';
};
