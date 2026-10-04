import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { DeviceAuthorizationPort } from '@/pupitre/shared/authentication/domain/DeviceAuthorizationPort';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, mergeMap, throwError } from 'rxjs';

const isAuthorizationFailure = (failure: unknown): boolean =>
  failure instanceof HttpErrorResponse && (failure.status === 401 || failure.status === 403);

const isCurrentToken = (token: string | undefined, authentication: AuthenticationPort): token is string =>
  token !== undefined && authentication.currentToken() === token;

export const httpDeviceAuthorizationInterceptor: HttpInterceptorFn = (request, next) => {
  const authentication = inject(AuthenticationPort);
  const authorization = inject(DeviceAuthorizationPort);
  const errorHandler = inject(ErrorHandlerPort);
  const token = authentication.currentToken();
  const reenrolAfter = async (failure: unknown): Promise<void> => {
    if (isAuthorizationFailure(failure)) {
      await authentication.synchronizeSession();
      if (isCurrentToken(token, authentication)) {
        errorHandler.observe(authorization.invalidateAuthorization(token));
      }
    }
  };
  return next(request).pipe(catchError((failure: unknown) => from(reenrolAfter(failure)).pipe(mergeMap(() => throwError(() => failure)))));
};
