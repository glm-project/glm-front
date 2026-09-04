import { CODES_QUE_LES_PORTS_ATTEIGNENT, CodeDeRefusDAtelier, RefusDAtelier } from '@/app/atelier/domain/RefusDAtelier';
import { codeDErreur } from '@/app/shared/api-client/infrastructure/secondary/codeDErreur';

const ERREURS_DE_L_ATELIER = 'urn:glm:erreur:atelier:';

const CODES_PAR_URN = new Map<string, CodeDeRefusDAtelier>(CODES_QUE_LES_PORTS_ATTEIGNENT.map(code => [ERREURS_DE_L_ATELIER + code, code]));

export const refusDAtelierDans = (echec: unknown): RefusDAtelier | undefined => {
  const erreur = codeDErreur(echec);

  if (erreur === undefined) {
    return undefined;
  }

  const code = CODES_PAR_URN.get(erreur.urn);

  return code === undefined ? undefined : new RefusDAtelier(code, erreur.message);
};
