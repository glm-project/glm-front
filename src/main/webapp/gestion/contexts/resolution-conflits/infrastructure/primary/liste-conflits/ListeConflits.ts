import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { Component, computed, inject, linkedSignal, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ConflitsReadPort } from '../../../domain/dossier/ConflitsReadPort';
import { FiltreConflits, PAGE_SIZE_CONFLITS } from '../../../domain/dossier/DossierConflit';
import { readPageConflitsDemandee } from '../../../domain/dossier/PageConflitsDemandee';
import { LIBELLES_CONFLITS } from '../LibellesConflits';
import { LIBELLES_LISTE_CONFLITS } from './LibellesListeConflits';

@Component({
  selector: 'glm-liste-conflits',
  imports: [RouterLink],
  templateUrl: './ListeConflits.html',
  styleUrl: './ListeConflits.css',
})
export class ListeConflits {
  private readonly port = inject(ConflitsReadPort);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly errors = inject(ErrorHandlerPort);
  private readonly params = toSignal(this.route.queryParamMap, { requireSync: true });
  protected readonly echecNavigation = linkedSignal({ source: this.params, computation: () => false });
  protected readonly pageDemandee = computed(() => readPageConflitsDemandee(this.params().get('page')));
  protected readonly filtre = computed(() => ({
    operateur: this.params().get('operateur') ?? '',
    element: this.params().get('element') ?? '',
    page: this.pageDemandee() ?? 1,
  }));
  protected readonly filtreActif = computed(() => this.filtre().operateur !== '' || this.filtre().element !== '');
  protected readonly libelles = { ...LIBELLES_CONFLITS, ...LIBELLES_LISTE_CONFLITS };
  protected readonly liste = resource({
    params: () => (this.pageDemandee() === undefined ? undefined : this.filtre()),
    loader: ({ params }) => this.port.list(params),
  });

  protected async filter(event: Event, operateur: string, element: string): Promise<void> {
    event.preventDefault();
    try {
      const navigue = await this.router.navigate(['/conflits'], {
        queryParams: { operateur: operateur.trim(), element: element.trim(), page: 1 },
      });
      this.echecNavigation.set(!navigue);
    } catch (failure: unknown) {
      this.errors.handleError(failure);
      this.echecNavigation.set(true);
    }
  }

  protected reload(): void {
    this.liste.reload();
  }

  protected pageCount(total: number): number {
    return Math.ceil(total / PAGE_SIZE_CONFLITS);
  }

  protected pageParams(page: number): FiltreConflits {
    return { ...this.filtre(), page };
  }
}
