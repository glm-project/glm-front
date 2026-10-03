import { SearchPicker } from '@/gestion/shared/design-system/infrastructure/primary/search-picker/SearchPicker';
import { Component, computed, input, linkedSignal, output, signal } from '@angular/core';
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
  imports: [SearchPicker],
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
  protected choose(element: ElementDisponible, picker: SearchPicker): void {
    picker.close();
    if (element.id.value !== this.elementCourant()) {
      this.selection.emit(element);
    }
  }

  readonly identite = input<ElementChiffre>();
  protected readonly libelles = LIBELLES_COUT_DE_REVIENT;
}
