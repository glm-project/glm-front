import { HttpErrorResponse } from '@angular/common/http';

const CODES_PUBLIES_PAR_GLM = 'urn:glm:erreur:';
const AUCUN_MESSAGE = '';

export interface CodeDErreur {
  urn: string;
  message: string;
}

interface ProblemDetail {
  type?: unknown;
  message?: unknown;
}

interface RefusMetier extends ProblemDetail {
  type: string;
}

const texteDe = (valeur: unknown): string | undefined => (typeof valeur === 'string' ? valeur : undefined);

const estUnRefusMetier = (probleme: ProblemDetail | null): probleme is RefusMetier =>
  texteDe(probleme?.type)?.startsWith(CODES_PUBLIES_PAR_GLM) === true;

const refusDans = (probleme: ProblemDetail | null): CodeDErreur | undefined =>
  estUnRefusMetier(probleme) ? { urn: probleme.type, message: texteDe(probleme.message) ?? AUCUN_MESSAGE } : undefined;

export const codeDErreur = (echec: unknown): CodeDErreur | undefined =>
  echec instanceof HttpErrorResponse ? refusDans(echec.error) : undefined;
