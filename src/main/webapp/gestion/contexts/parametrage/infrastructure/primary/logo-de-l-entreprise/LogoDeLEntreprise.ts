import { MarqueGlm } from '@/gestion/shared/design-system/infrastructure/primary/marque-glm/MarqueGlm';
import { Component, inject, OnInit } from '@angular/core';
import { LogoAffiche } from '../../../application/LogoAffiche';

@Component({
  selector: 'glm-logo-de-l-entreprise',
  templateUrl: './LogoDeLEntreprise.html',
  styleUrl: './LogoDeLEntreprise.css',
  imports: [MarqueGlm],
})
export class LogoDeLEntreprise implements OnInit {
  private readonly logo = inject(LogoAffiche);

  protected readonly image = this.logo.image;

  ngOnInit(): void {
    this.logo.lire().catch(() => undefined);
  }
}
