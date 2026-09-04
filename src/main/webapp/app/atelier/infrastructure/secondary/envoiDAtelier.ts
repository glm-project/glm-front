import { CodeDeRefusDAtelier, RefusDAtelier } from '@/app/atelier/domain/RefusDAtelier';
import { refusDAtelierDans } from './refusDAtelierDans';

type Envoi = () => Promise<unknown>;

const SAISIE_CONCURRENTE: CodeDeRefusDAtelier = 'saisie-concurrente';

const porte = (refus: unknown, code: CodeDeRefusDAtelier): boolean => refus instanceof RefusDAtelier && refus.code === code;

const envoyerUneFois = async (envoi: Envoi): Promise<void> => {
  try {
    await envoi();
  } catch (echec: unknown) {
    throw refusDAtelierDans(echec) ?? echec;
  }
};

export const envoyer = async (envoi: Envoi): Promise<void> => {
  try {
    await envoyerUneFois(envoi);
  } catch (refus: unknown) {
    if (porte(refus, SAISIE_CONCURRENTE)) {
      await envoyerUneFois(envoi);
      return;
    }

    throw refus;
  }
};

export const envoyerEnAbsorbant = async (absorbe: CodeDeRefusDAtelier, envoi: Envoi): Promise<void> => {
  try {
    await envoyer(envoi);
  } catch (refus: unknown) {
    if (porte(refus, absorbe)) {
      return;
    }

    throw refus;
  }
};
