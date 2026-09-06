import { IdentiteOperateurDesigne, RefusDAtelierVisible } from '@/pupitre/contexts/atelier/domain/designation/FenetreOperateur';
import { LIBELLES_ENTETE_PUPITRE } from '@/pupitre/contexts/atelier/infrastructure/primary/pupitre/LibellesAtelier';
import { Component, input, output } from '@angular/core';

@Component({
  selector: 'glm-pupitre-header',
  host: { 'data-selector': 'pupitre-header' },
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class PupitreHeader {
  readonly labels = LIBELLES_ENTETE_PUPITRE;
  readonly heading = input.required<string>();
  readonly connected = input.required<boolean>();
  readonly operateur = input<IdentiteOperateurDesigne>();
  readonly refus = input<RefusDAtelierVisible>();
  readonly erreur = input<string>();
  readonly finRequested = output();
}
