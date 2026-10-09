import { MarqueGlm } from '@/gestion/shared/design-system/infrastructure/primary/marque-glm/MarqueGlm';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ImageDuLogo } from '../../../domain/ImageDuLogo';
import { ParametragePort } from '../../../domain/ParametragePort';

@Component({
  selector: 'glm-logo-de-l-entreprise',
  templateUrl: './LogoDeLEntreprise.html',
  styleUrl: './LogoDeLEntreprise.css',
  imports: [MarqueGlm],
})
export class LogoDeLEntreprise implements OnInit {
  private readonly port = inject(ParametragePort);

  protected readonly image = signal<ImageDuLogo | undefined>(undefined);

  ngOnInit(): void {
    this.port
      .parametrage()
      .then(parametrage => (parametrage.logo === undefined ? undefined : this.port.imageDuLogo(parametrage.logo)))
      .then(
        image => {
          this.image.set(image);
        },
        () => undefined,
      );
  }
}
