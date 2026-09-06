import { decideReplay, OperationDAtelier } from '@/pupitre/contexts/atelier/domain/journal/PupitreReplayPolicy';
import { findRefusDAtelierIn } from './findRefusDAtelierIn';

type RequestAction = () => Promise<unknown>;

const sendOnce = async (request: RequestAction): Promise<void> => {
  try {
    await request();
  } catch (failure: unknown) {
    throw findRefusDAtelierIn(failure) ?? failure;
  }
};

const sendWithRetry = async (request: RequestAction, reread: RequestAction): Promise<void> => {
  try {
    await sendOnce(request);
  } catch (refus: unknown) {
    if (decideReplay('GESTE_EXPLICITE', refus) === 'RELIRE_ET_REJOUER') {
      await reread();
      await sendOnce(request);
      return;
    }
    throw refus;
  }
};

export const send = async (
  request: RequestAction,
  reread: RequestAction,
  operation: OperationDAtelier = 'GESTE_EXPLICITE',
): Promise<void> => {
  try {
    await sendWithRetry(request, reread);
  } catch (refus: unknown) {
    if (decideReplay(operation, refus, 'REJEU') !== 'ACCEPTER') {
      throw refus;
    }
  }
};
