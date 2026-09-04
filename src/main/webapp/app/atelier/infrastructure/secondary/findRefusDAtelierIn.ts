import { CODES_DE_REFUS_D_ATELIER, CodeDeRefusDAtelier, RefusDAtelier } from '@/app/atelier/domain/RefusDAtelier';
import { findCodeDErreurIn } from '@/app/shared/api-client/infrastructure/secondary/findCodeDErreurIn';

const ERREURS_DE_L_ATELIER = 'urn:glm:erreur:atelier:';

const CODES_PAR_URN = new Map<string, CodeDeRefusDAtelier>(CODES_DE_REFUS_D_ATELIER.map(code => [ERREURS_DE_L_ATELIER + code, code]));

export const findRefusDAtelierIn = (echec: unknown): RefusDAtelier | undefined => {
  const erreur = findCodeDErreurIn(echec);

  if (erreur === undefined) {
    return undefined;
  }

  const code = CODES_PAR_URN.get(erreur.urn);

  return code === undefined ? undefined : new RefusDAtelier(code, erreur.message);
};
