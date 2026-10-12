import { TypeScriptActesDAtelier } from '@/gestion/contexts/atelier/infrastructure/primary/TypeScriptActesDAtelier';
import { Provider } from '@angular/core';
import { ActesDAtelierPort } from '../../domain/ActesDAtelierPort';
import { ActesParLAtelier } from './ActesParLAtelier';

export const actesDAtelierProviders: Provider[] = [TypeScriptActesDAtelier, { provide: ActesDAtelierPort, useClass: ActesParLAtelier }];
