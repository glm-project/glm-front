import { Component, computed, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ConflitsReadPort } from '../../../domain/dossier/ConflitsReadPort';
import { LIBELLES_CONFLITS } from '../LibellesConflits';
import { LIBELLES_LISTE_CONFLITS } from './LibellesListeConflits';

@Component({
  selector: 'glm-liste-conflits',
  templateUrl: './ListeConflits.html',
  imports: [RouterLink],
})
export class ListeConflits {
  private readonly port = inject(ConflitsReadPort);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly params = toSignal(this.route.queryParamMap, { requireSync: true });
  protected readonly filtre = computed(() => ({
    operateur: this.params().get('operateur') ?? '',
    element: this.params().get('element') ?? '',
    page: Number(this.params().get('page') ?? 1),
  }));
  protected readonly filtreActif = computed(() => this.filtre().operateur !== '' || this.filtre().element !== '');
  protected readonly libelles = { ...LIBELLES_CONFLITS, ...LIBELLES_LISTE_CONFLITS };
  protected readonly liste = resource({ params: this.filtre, loader: ({ params }) => this.port.list(params) });

  protected async filter(event: Event, operateur: string, element: string): Promise<void> {
    event.preventDefault();
    await this.router.navigate(['/conflits'], { queryParams: { operateur: operateur.trim(), element: element.trim(), page: 1 } });
  }

  protected reload(): void {
    this.liste.reload();
  }
}
