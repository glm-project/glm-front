import { Matricule } from '@/pupitre/contexts/atelier/domain/designation/Matricule';

export const matriculeFixture = (saisie: string): Matricule =>
  Array.from(saisie).reduce((matricule, caractere) => matricule.afterDigit(caractere), Matricule.empty());
