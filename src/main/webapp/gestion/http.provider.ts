import { httpAuthInterceptor } from '@/app/shared/authentication/infrastructure/primary/http-auth.interceptor';
import { httpSessionRefreshInterceptor } from '@/gestion/shared/authentication/infrastructure/primary/http-session-refresh.interceptor';
import { HttpInterceptorFn, provideHttpClient, withInterceptors } from '@angular/common/http';

const freshApiDataInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith('/api/')) {
    return next(request);
  }
  return next(request.clone({ cache: 'no-store', setHeaders: { 'Cache-Control': 'no-cache, no-store' } }));
};

export const gestionHttpProvider = provideHttpClient(
  withInterceptors([freshApiDataInterceptor, httpSessionRefreshInterceptor, httpAuthInterceptor]),
);
