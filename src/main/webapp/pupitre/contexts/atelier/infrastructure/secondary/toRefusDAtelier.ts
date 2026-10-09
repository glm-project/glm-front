import { CODES_DE_REFUS_D_ATELIER } from '@/pupitre/contexts/atelier/domain/refus/MotifDeRefus';
import { RefusDAtelier } from '@/pupitre/contexts/atelier/domain/refus/RefusDAtelier';

const ERREURS_DE_L_ATELIER = 'urn:glm:erreur:atelier:';

export const toRefusDAtelier = (urn: string, message: string): RefusDAtelier | undefined => {
  const code = CODES_DE_REFUS_D_ATELIER.find(candidate => ERREURS_DE_L_ATELIER + candidate === urn);

  return code === undefined ? undefined : new RefusDAtelier(code, message);
};
