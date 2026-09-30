import { MotifDeRefus } from '../refus/MotifDeRefus';
import { RefusDAtelier } from '../refus/RefusDAtelier';
import { RefusDePublication } from '../refus/RefusDePublication';

export type ReplayDecision = 'RELIRE_ET_REJOUER' | 'PROPAGER';

const carriesAMotif = (refus: unknown): refus is RefusDAtelier | RefusDePublication =>
  refus instanceof RefusDAtelier || refus instanceof RefusDePublication;

const motifOf = (refus: unknown): MotifDeRefus => (carriesAMotif(refus) ? refus.motif : MotifDeRefus.none());

const canRetryConcurrence = (refus: unknown, tentative: 'INITIALE' | 'REJEU'): boolean =>
  motifOf(refus).is('saisie-concurrente') && tentative === 'INITIALE';

export const decideReplay = (refus: unknown, tentative: 'INITIALE' | 'REJEU' = 'INITIALE'): ReplayDecision => {
  if (canRetryConcurrence(refus, tentative)) {
    return 'RELIRE_ET_REJOUER';
  }
  return 'PROPAGER';
};
