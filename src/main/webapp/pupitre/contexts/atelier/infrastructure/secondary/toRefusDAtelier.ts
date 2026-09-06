import { CODES_DE_REFUS_D_ATELIER, CodeDeRefusDAtelier, RefusDAtelier } from '@/pupitre/contexts/atelier/domain/refus/RefusDAtelier';

const ERREURS_DE_L_ATELIER = 'urn:glm:erreur:atelier:';

const CODES_PAR_URN = new Map<string, CodeDeRefusDAtelier>(CODES_DE_REFUS_D_ATELIER.map(code => [ERREURS_DE_L_ATELIER + code, code]));

export const toRefusDAtelier = (urn: string, message: string): RefusDAtelier | undefined => {
  const code = CODES_PAR_URN.get(urn);

  return code === undefined ? undefined : new RefusDAtelier(code, message);
};
