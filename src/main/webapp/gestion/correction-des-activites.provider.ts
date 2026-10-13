import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { Provider } from '@angular/core';
import { CorrectionsPort } from './contexts/correction-des-activites/domain/correction/CorrectionsPort';
import { JourneeACorrigerPort } from './contexts/correction-des-activites/domain/journee/JourneeACorrigerPort';
import { HttpCorrections } from './contexts/correction-des-activites/infrastructure/secondary/HttpCorrections';
import { HttpJourneeACorriger } from './contexts/correction-des-activites/infrastructure/secondary/HttpJourneeACorriger';

export const correctionDesActivitesProvider: Provider[] = [
  ApiClient,
  { provide: JourneeACorrigerPort, useClass: HttpJourneeACorriger },
  { provide: CorrectionsPort, useClass: HttpCorrections },
];
