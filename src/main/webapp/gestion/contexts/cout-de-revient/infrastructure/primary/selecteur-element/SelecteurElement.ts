import { Icon } from '@/app/shared/design-system/infrastructure/primary/icon/icon';
import { OverlayModule } from '@angular/cdk/overlay';
import { Component, computed, ElementRef, input, linkedSignal, output, signal, viewChild } from '@angular/core';
import { ElementChiffre } from '../../../domain/element/ElementChiffre';
import { ElementDisponible } from '../../../domain/element/ElementDisponible';
import { LIBELLES_COUT_DE_REVIENT } from '../LibellesCoutDeRevient';

const normalizeSearch = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLocaleLowerCase('fr');

@Component({
  selector: 'glm-selecteur-element',
  templateUrl: './SelecteurElement.html',
  styleUrl: './SelecteurElement.css',
  imports: [Icon, OverlayModule],
})
export class SelecteurElement {
  readonly elementCourant = input<string>();
  readonly selection = output<ElementDisponible>();
  readonly indisponible = input(false);
  readonly elements = input.required<readonly ElementDisponible[]>();
  protected readonly saisie = signal('');
  protected readonly propositions = computed(() =>
    this.elements()
      .filter(element =>
        normalizeSearch(this.libelles.identite(element.identite.type, element.identite.nom)).includes(normalizeSearch(this.saisie())),
      )
      .sort(
        (first, second) =>
          first.identite.nom.localeCompare(second.identite.nom, 'fr')
          || this.libelles.types[first.identite.type].localeCompare(this.libelles.types[second.identite.type], 'fr'),
      ),
  );
  protected readonly ouvert = linkedSignal({ source: this.elementCourant, computation: () => false });
  private readonly declencheur = viewChild.required<ElementRef<HTMLButtonElement>>('declencheur');
  private readonly recherche = viewChild.required<ElementRef<HTMLInputElement>>('recherche');

  protected choose(element: ElementDisponible): void {
    this.close();
    if (element.id.value !== this.elementCourant()) {
      this.selection.emit(element);
    }
  }

  protected close(): void {
    this.ouvert.set(false);
    this.declencheur().nativeElement.focus();
  }
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
    }
  }

  protected open(): void {
    this.saisie.set('');
    this.ouvert.set(true);
  }
  protected focusSearch(): void {
    this.recherche().nativeElement.focus();
  }

  readonly identite = input<ElementChiffre>();
  protected readonly libelles = LIBELLES_COUT_DE_REVIENT;
}
