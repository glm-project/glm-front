import { Identifiant } from '@/pupitre/contexts/atelier/domain/designation/Identifiant';

export const identifiantFixture = (saisie: string): Identifiant =>
  Array.from(saisie).reduce((identifiant, caractere) => identifiant.afterDigit(caractere), Identifiant.empty());
