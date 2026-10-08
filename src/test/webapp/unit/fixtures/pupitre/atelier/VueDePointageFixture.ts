import { ElementDePointage, VueDePointage } from '@/pupitre/contexts/atelier/domain/designation/fenetre-operateur/VueDePointage';

export const elementsDeLaZoneFixture = (vue: VueDePointage | undefined, categorie: string): readonly ElementDePointage[] =>
  vue?.zones.find(zone => zone.categorie === categorie)?.elements ?? [];
