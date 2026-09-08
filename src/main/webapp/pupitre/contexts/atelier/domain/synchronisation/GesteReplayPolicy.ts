import { EvenementsDuJournal, GesteDAtelier, GesteDePresence } from '../journal-du-pupitre/JournalDuPupitre';
import { MotifDeRefus } from '../refus/MotifDeRefus';
import { RefusDAtelier } from '../refus/RefusDAtelier';
import { RefusDePublication } from '../refus/RefusDePublication';

export type OperationDAtelier = 'ARRIVEE_ASSUREE' | 'PRESENCE_ASSUREE' | 'REPRISE_APRES_ARRIVEE_OUVERTE' | 'GESTE_EXPLICITE';
export type ReplayDecision = 'ACCEPTER' | 'RELIRE_ET_REJOUER' | 'PROPAGER';

const carriesAMotif = (refus: unknown): refus is RefusDAtelier | RefusDePublication =>
  refus instanceof RefusDAtelier || refus instanceof RefusDePublication;

const motifOf = (refus: unknown): MotifDeRefus => (carriesAMotif(refus) ? refus.motif : MotifDeRefus.aucun());

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
  motifOf(refus).is('saisie-concurrente') && tentative === 'INITIALE';

const absorbsAlreadyOpenDay = (operation: OperationDAtelier, refus: unknown): boolean =>
  operation === 'ARRIVEE_ASSUREE' && motifOf(refus).is('journee-de-travail-deja-ouverte');

const absorbsPresenceRefusal = (operation: OperationDAtelier, refus: unknown): boolean =>
  absorbsForbiddenPresenceTransition(operation) && motifOf(refus).is('transition-de-presence-interdite');

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
