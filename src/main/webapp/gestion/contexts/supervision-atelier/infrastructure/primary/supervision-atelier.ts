import { Component, inject, resource } from '@angular/core';
import { DonneesDeSupervisionPort } from '../../domain/DonneesDeSupervisionPort';

@Component({
  selector: 'glm-supervision-atelier',
  templateUrl: './supervision-atelier.html',
  host: { 'data-selector': 'supervision-atelier' },
})
export class SupervisionAtelier {
  private readonly donneesPort = inject(DonneesDeSupervisionPort);
  protected readonly donnees = resource({ loader: () => this.donneesPort.read() });
}
