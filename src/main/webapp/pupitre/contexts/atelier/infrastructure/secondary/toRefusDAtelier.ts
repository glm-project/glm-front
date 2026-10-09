import { codeDeRefusDepuisUrn } from '@/pupitre/contexts/atelier/domain/refus/MotifDeRefus';
import { RefusDAtelier } from '@/pupitre/contexts/atelier/domain/refus/RefusDAtelier';

export const toRefusDAtelier = (urn: string, message: string): RefusDAtelier | undefined => {
  const code = codeDeRefusDepuisUrn(urn);

  return code === undefined ? undefined : new RefusDAtelier(code, message);
};
