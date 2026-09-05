import { decideRejeu, OperationDAtelier } from '@/pupitre/contexts/atelier/domain/PolitiqueDeRejeu';
import { findRefusDAtelierIn } from './findRefusDAtelierIn';

type Envoi = () => Promise<unknown>;

const sendOnce = async (envoi: Envoi): Promise<void> => {
  try {
    await envoi();
  } catch (echec: unknown) {
    throw findRefusDAtelierIn(echec) ?? echec;
  }
};

const sendWithRetry = async (envoi: Envoi, relire: Envoi): Promise<void> => {
  try {
    await sendOnce(envoi);
  } catch (refus: unknown) {
    if (decideRejeu('GESTE_EXPLICITE', refus) === 'RELIRE_ET_REJOUER') {
      await relire();
      await sendOnce(envoi);
      return;
    }
    throw refus;
  }
};

export const send = async (envoi: Envoi, relire: Envoi, operation: OperationDAtelier = 'GESTE_EXPLICITE'): Promise<void> => {
  try {
    await sendWithRetry(envoi, relire);
  } catch (refus: unknown) {
    if (decideRejeu(operation, refus, 'REJEU') !== 'ACCEPTER') {
      throw refus;
    }
  }
};
