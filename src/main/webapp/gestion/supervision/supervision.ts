import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { Component } from '@angular/core';
import { DonneesDeSupervisionPort } from '../contexts/supervision-atelier/domain/supervision/DonneesDeSupervisionPort';
import { SupervisionAtelier } from '../contexts/supervision-atelier/infrastructure/primary/supervision-atelier/supervision-atelier';
import { HttpDonneesDeSupervision } from '../contexts/supervision-atelier/infrastructure/secondary/supervision/HttpDonneesDeSupervision';

@Component({
  selector: 'glm-supervision',
  template: '<glm-supervision-atelier />',
  imports: [SupervisionAtelier],
  providers: [ApiClient, { provide: DonneesDeSupervisionPort, useClass: HttpDonneesDeSupervision }],
})
export class Supervision {}
