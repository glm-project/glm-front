import { httpAuthInterceptor } from '@/app/shared/authentication/infrastructure/primary/http-auth.interceptor';
import { httpSessionRefreshInterceptor } from '@/gestion/shared/authentication/infrastructure/primary/http-session-refresh.interceptor';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

export const gestionHttpProvider = provideHttpClient(withInterceptors([httpSessionRefreshInterceptor, httpAuthInterceptor]));
