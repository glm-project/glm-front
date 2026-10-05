import { PointagesDeLOperateurPort } from '@/pupitre/contexts/pointages-de-l-operateur/domain/PointagesDeLOperateurPort';
import { HttpPointagesDeLOperateur } from '@/pupitre/contexts/pointages-de-l-operateur/infrastructure/secondary/http/HttpPointagesDeLOperateur';
import { Provider } from '@angular/core';

export const pointagesDeLOperateurProvider: Provider[] = [{ provide: PointagesDeLOperateurPort, useClass: HttpPointagesDeLOperateur }];
