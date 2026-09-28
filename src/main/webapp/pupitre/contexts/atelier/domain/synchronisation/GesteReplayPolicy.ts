import { GesteDAtelier } from '../journal-du-pupitre/JournalDuPupitre';
import { MotifDeRefus } from '../refus/MotifDeRefus';
import { RefusDAtelier } from '../refus/RefusDAtelier';
import { RefusDePublication } from '../refus/RefusDePublication';

export type OperationDAtelier = 'ARRIVEE_ASSUREE' | 'GESTE_EXPLICITE';
export type ReplayDecision = 'ACCEPTER' | 'RELIRE_ET_REJOUER' | 'PROPAGER';

const carriesAMotif = (refus: unknown): refus is RefusDAtelier | RefusDePublication =>
  refus instanceof RefusDAtelier || refus instanceof RefusDePublication;

const motifOf = (refus: unknown): MotifDeRefus => (carriesAMotif(refus) ? refus.motif : MotifDeRefus.none());

export const operationFor = (geste: GesteDAtelier): OperationDAtelier =>
  geste.nature === 'ARRIVEE' ? 'ARRIVEE_ASSUREE' : 'GESTE_EXPLICITE';

const canRetryConcurrence = (refus: unknown, tentative: 'INITIALE' | 'REJEU'): boolean =>
  motifOf(refus).is('saisie-concurrente') && tentative === 'INITIALE';

const absorbsAlreadyOpenDay = (operation: OperationDAtelier, refus: unknown): boolean =>
  operation === 'ARRIVEE_ASSUREE' && motifOf(refus).is('journee-de-travail-deja-ouverte');

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
  return 'PROPAGER';
};
