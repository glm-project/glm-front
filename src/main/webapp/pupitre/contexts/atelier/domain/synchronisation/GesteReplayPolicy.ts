import { EvenementsDuJournal, GesteDAtelier, GesteDePresence } from '../journal-du-pupitre/JournalDuPupitre';
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

const followsOpenedArrival = (geste: GesteDePresence, evenements: EvenementsDuJournal): boolean =>
  geste.assuranceArriveeId !== undefined && evenements.hasOpenedDay(geste.assuranceArriveeId, geste.operateurId);

export const operationFor = (geste: GesteDAtelier, evenements = new EvenementsDuJournal([])): OperationDAtelier => {
  if (geste.nature === 'ARRIVEE') {
    return 'ARRIVEE_ASSUREE';
  }
  if (geste.nature !== 'PRESENCE') {
    return 'GESTE_EXPLICITE';
  }
  if (geste.implicite) {
    return 'PRESENCE_ASSUREE';
  }
  if (followsOpenedArrival(geste, evenements)) {
    return 'REPRISE_APRES_ARRIVEE_OUVERTE';
  }
  return 'GESTE_EXPLICITE';
};

const canRetryConcurrence = (refus: unknown, tentative: 'INITIALE' | 'REJEU'): boolean =>
  matches(refus, 'saisie-concurrente') && tentative === 'INITIALE';

const absorbsAlreadyOpenDay = (operation: OperationDAtelier, refus: unknown): boolean =>
  operation === 'ARRIVEE_ASSUREE' && matches(refus, 'journee-de-travail-deja-ouverte');

const absorbsPresenceRefusal = (operation: OperationDAtelier, refus: unknown): boolean =>
  absorbsForbiddenPresenceTransition(operation) && matches(refus, 'transition-de-presence-interdite');

export const decideReplay = (
  operation: OperationDAtelier,
  refus: unknown,
  tentative: 'INITIALE' | 'REJEU' = 'INITIALE',
): ReplayDecision => {
  if (canRetryConcurrence(refus, tentative)) {
    return 'RELIRE_ET_REJOUER';
  }
  if (absorbsAlreadyOpenDay(operation, refus)) {
    return 'ACCEPTER';
  }
  if (absorbsPresenceRefusal(operation, refus)) {
    return 'ACCEPTER';
  }
  return 'PROPAGER';
};
