import { CodeDeRefusDAtelier, RefusDAtelier } from '@/app/atelier/domain/RefusDAtelier';
import { findRefusDAtelierIn } from './findRefusDAtelierIn';

type Envoi = () => Promise<unknown>;

const SAISIE_CONCURRENTE: CodeDeRefusDAtelier = 'saisie-concurrente';

const matches = (refus: unknown, code: CodeDeRefusDAtelier): boolean => refus instanceof RefusDAtelier && refus.code === code;

const sendOnce = async (envoi: Envoi): Promise<void> => {
  try {
    await envoi();
  } catch (echec: unknown) {
    throw findRefusDAtelierIn(echec) ?? echec;
  }
};

export const send = async (envoi: Envoi, relire: Envoi): Promise<void> => {
  try {
    await sendOnce(envoi);
  } catch (refus: unknown) {
    if (matches(refus, SAISIE_CONCURRENTE)) {
      await relire();
      await sendOnce(envoi);
      return;
    }

    throw refus;
  }
};

export const sendAbsorbing = async (absorbe: CodeDeRefusDAtelier, envoi: Envoi, relire: Envoi): Promise<void> => {
  try {
    await send(envoi, relire);
  } catch (refus: unknown) {
    if (matches(refus, absorbe)) {
      return;
    }

    throw refus;
  }
};
