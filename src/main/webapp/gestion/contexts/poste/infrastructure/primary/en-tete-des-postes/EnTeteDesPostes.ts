import { Component, computed, input } from '@angular/core';
import { NatureGeree } from '../../../domain/NatureGeree';

@Component({
  selector: 'glm-en-tete-des-postes',
  templateUrl: './EnTeteDesPostes.html',
})
export class EnTeteDesPostes {
  readonly nature = input.required<NatureGeree | undefined>();
  readonly total = input.required<number>();

  protected readonly compte = computed(() => {
    const postes = this.nature()?.postes ?? this.total();
    if (postes === 0) {
      return 'aucun poste';
    }
    return postes === 1 ? '1 poste' : `${String(postes)} postes`;
  });
}
