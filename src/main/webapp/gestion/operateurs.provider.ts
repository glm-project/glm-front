import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { Provider } from '@angular/core';
import { OperateursPort } from './contexts/operateur/domain/OperateursPort';
import { HttpOperateurs } from './contexts/operateur/infrastructure/secondary/HttpOperateurs';

export const operateursProvider: Provider[] = [ApiClient, { provide: OperateursPort, useClass: HttpOperateurs }];
