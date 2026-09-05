import { HttpErrorResponse } from '@angular/common/http';

const GLM_ERROR_PREFIX = 'urn:glm:erreur:';
const EMPTY_MESSAGE = '';

export interface ApiError {
  urn: string;
  message: string;
}

interface ProblemDetail {
  type?: unknown;
  message?: unknown;
}

interface BusinessProblemDetail extends ProblemDetail {
  type: string;
}

const asString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

const asProblemDetail = (value: unknown): ProblemDetail | null => (typeof value === 'object' && value !== null ? value : null);

const isBusinessProblem = (problem: ProblemDetail | null): problem is BusinessProblemDetail =>
  asString(problem?.type)?.startsWith(GLM_ERROR_PREFIX) === true;

const findBusinessProblemIn = (problem: ProblemDetail | null): ApiError | undefined =>
  isBusinessProblem(problem) ? { urn: problem.type, message: asString(problem.message) ?? EMPTY_MESSAGE } : undefined;

export const findApiErrorIn = (failure: unknown): ApiError | undefined =>
  failure instanceof HttpErrorResponse ? findBusinessProblemIn(asProblemDetail(failure.error)) : undefined;
