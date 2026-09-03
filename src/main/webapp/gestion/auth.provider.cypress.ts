import { AuthenticationPort } from '@/app/authentication/domain/AuthenticationPort';
import { InMemoryAuthentication } from '@/app/authentication/infrastructure/secondary/in-memory/InMemoryAuthentication';
import { Provider } from '@angular/core';

export const authProvider: Provider[] = [{ provide: AuthenticationPort, useClass: InMemoryAuthentication }];
