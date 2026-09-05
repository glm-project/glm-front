import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, mergeMap, throwError } from 'rxjs';

const reenrolAfter = async (failure: unknown, token: string | undefined, authentication: AuthenticationPort): Promise<void> => {
  if (failure instanceof HttpErrorResponse && (failure.status === 401 || failure.status === 403)) {
    await authentication.synchronizeSession();
    if (token !== undefined && authentication.currentToken() === token) {
      authentication.logout();
      void authentication.authenticate();
    }
  }
};

export const httpDeviceAuthorizationInterceptor: HttpInterceptorFn = (request, next) => {
  const authentication = inject(AuthenticationPort);
  const token = authentication.currentToken();
  return next(request).pipe(
    catchError((failure: unknown) => from(reenrolAfter(failure, token, authentication)).pipe(mergeMap(() => throwError(() => failure)))),
  );
};
