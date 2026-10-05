import { CdkTrapFocus } from '@angular/cdk/a11y';
import { AfterViewInit, Component, computed, ElementRef, input, output, viewChild } from '@angular/core';
import { LIBELLES_REINITIALISATION } from '../LibellesEnrolement';

export type ComptageDesGestesEnAttente = 'EN_COURS' | number | 'ECHEC';

@Component({
  selector: 'glm-reinitialisation',
  imports: [CdkTrapFocus],
  host: { 'data-selector': 'reinitialisation' },
  templateUrl: './reinitialisation.html',
  styleUrl: './reinitialisation.css',
})
export class Reinitialisation implements AfterViewInit {
  protected readonly labels = LIBELLES_REINITIALISATION;
  readonly confirmationEnabled = input(true);
  readonly gestesEnAttente = input.required<ComptageDesGestesEnAttente>();
  readonly annule = output();
  readonly confirme = output();
  protected readonly avertissement = computed<string | undefined>(() => {
    const gestes = this.gestesEnAttente();
    if (gestes === 'ECHEC') return LIBELLES_REINITIALISATION.avertissementGenerique;
    return typeof gestes === 'number' && gestes > 0 ? LIBELLES_REINITIALISATION.avertissement(gestes) : undefined;
  });
  protected readonly confirmationLibelle = computed<string>(() => {
    const gestes = this.gestesEnAttente();
    return typeof gestes === 'number' && gestes > 0 ? LIBELLES_REINITIALISATION.confirmerQuandMeme : LIBELLES_REINITIALISATION.confirmer;
  });
  protected readonly confirmationAvailable = computed<boolean>(() => this.confirmationEnabled() && this.gestesEnAttente() !== 'EN_COURS');
  private readonly annuler = viewChild.required<ElementRef<HTMLButtonElement>>('annuler');

  ngAfterViewInit(): void {
    this.annuler().nativeElement.focus();
  }
}
