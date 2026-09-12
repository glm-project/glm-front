import { CdkTrapFocus } from '@angular/cdk/a11y';
import { AfterViewInit, Component, ElementRef, input, output, viewChild } from '@angular/core';
import { LIBELLES_REINITIALISATION } from '../LibellesEnrolement';

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
  readonly annule = output();
  readonly confirme = output();
  private readonly annuler = viewChild.required<ElementRef<HTMLButtonElement>>('annuler');

  ngAfterViewInit(): void {
    this.annuler().nativeElement.focus();
  }
}
