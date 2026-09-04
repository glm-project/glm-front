import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { InMemoryAuthentication } from '@/app/shared/authentication/infrastructure/secondary/in-memory/InMemoryAuthentication';
import { Provider } from '@angular/core';

export const authProvider: Provider[] = [{ provide: AuthenticationPort, useClass: InMemoryAuthentication }];
