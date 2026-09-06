import { RefusDAtelier } from '../refus/RefusDAtelier';
import { RefusDuPupitre } from '../refus/RefusDuPupitre';
import { LocalGeste } from './LocalPupitreState';

export type OperationDAtelier = 'ARRIVEE_ASSUREE' | 'PRESENCE_ASSUREE' | 'GESTE_EXPLICITE';
export type ReplayDecision = 'ACCEPTER' | 'RELIRE_ET_REJOUER' | 'PROPAGER';

const matches = (refus: unknown, code: string): boolean => {
  if (refus instanceof RefusDAtelier) {
    return refus.code === code;
  }
  return refus instanceof RefusDuPupitre && refus.motif === code;
};

export const operationFor = (geste: LocalGeste): OperationDAtelier => {
  if (geste.nature === 'ARRIVEE') {
    return 'ARRIVEE_ASSUREE';
  }
  if (geste.nature === 'PRESENCE' && geste.implicite) {
    return 'PRESENCE_ASSUREE';
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
  if (operation === 'PRESENCE_ASSUREE' && matches(refus, 'transition-de-presence-interdite')) {
    return 'ACCEPTER';
  }
  return 'PROPAGER';
};
