import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { Provider } from '@angular/core';
import { JourneeACorrigerPort } from './contexts/correction-des-activites/domain/journee/JourneeACorrigerPort';
import { HttpJourneeACorriger } from './contexts/correction-des-activites/infrastructure/secondary/HttpJourneeACorriger';

export const correctionDesActivitesProvider: Provider[] = [ApiClient, { provide: JourneeACorrigerPort, useClass: HttpJourneeACorriger }];
