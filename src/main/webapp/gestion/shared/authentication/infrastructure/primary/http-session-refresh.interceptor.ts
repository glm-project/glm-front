import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { defer, switchMap } from 'rxjs';

export const httpSessionRefreshInterceptor: HttpInterceptorFn = (request, next) => {
  const authentication = inject(AuthenticationPort);
  return defer(() => authentication.synchronizeSession()).pipe(switchMap(() => next(request)));
};
