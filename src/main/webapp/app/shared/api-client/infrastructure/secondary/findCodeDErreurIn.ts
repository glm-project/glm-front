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

const asString = (valeur: unknown): string | undefined => (typeof valeur === 'string' ? valeur : undefined);

const isRefusMetier = (probleme: ProblemDetail | null): probleme is RefusMetier =>
  asString(probleme?.type)?.startsWith(CODES_PUBLIES_PAR_GLM) === true;

const findRefusMetierIn = (probleme: ProblemDetail | null): CodeDErreur | undefined =>
  isRefusMetier(probleme) ? { urn: probleme.type, message: asString(probleme.message) ?? AUCUN_MESSAGE } : undefined;

export const findCodeDErreurIn = (echec: unknown): CodeDErreur | undefined =>
  echec instanceof HttpErrorResponse ? findRefusMetierIn(echec.error) : undefined;
