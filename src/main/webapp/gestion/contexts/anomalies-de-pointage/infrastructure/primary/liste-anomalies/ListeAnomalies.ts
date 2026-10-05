import { InstantLongDayPipe } from '@/app/shared/date-format/infrastructure/primary/InstantPipes';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { Component, computed, inject, linkedSignal, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AnomaliesReadPort } from '../../../domain/dossier/AnomaliesReadPort';
import { FiltreAnomalies, NatureAnomalie, PAGE_SIZE_ANOMALIES } from '../../../domain/dossier/DossierAnomalie';
import { NATURE_ANOMALIE_PAR_DEFAUT, readNatureAnomalieDemandee } from '../../../domain/dossier/NatureAnomalieDemandee';
import { readPageAnomaliesDemandee } from '../../../domain/dossier/PageAnomaliesDemandee';
import { LIBELLES_ANOMALIES } from '../LibellesAnomalies';
import { LIBELLES_LISTE_ANOMALIES } from './LibellesListeAnomalies';

@Component({
  selector: 'glm-liste-anomalies',
  imports: [RouterLink, InstantLongDayPipe],
  templateUrl: './ListeAnomalies.html',
  styleUrl: './ListeAnomalies.css',
})
export class ListeAnomalies {
  private readonly port = inject(AnomaliesReadPort);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly errors = inject(ErrorHandlerPort);
  protected readonly now = new Date();
  private readonly params = toSignal(this.route.queryParamMap, { requireSync: true });
  protected readonly echecNavigation = linkedSignal({ source: this.params, computation: () => false });
  protected readonly pageDemandee = computed(() => readPageAnomaliesDemandee(this.params().get('page')));
  protected readonly natureDemandee = computed(() => readNatureAnomalieDemandee(this.params().get('nature')));
  protected readonly filtre = computed(() => ({
    nature: this.natureDemandee() ?? NATURE_ANOMALIE_PAR_DEFAUT,
    operateur: this.params().get('operateur') ?? '',
    element: this.params().get('element') ?? '',
    page: this.pageDemandee() ?? 1,
  }));
  protected readonly filtreActif = computed(() => this.filtre().operateur !== '' || this.filtre().element !== '');
  protected readonly libelles = { ...LIBELLES_ANOMALIES, ...LIBELLES_LISTE_ANOMALIES };
  protected readonly libellesDeNature = computed(() => LIBELLES_LISTE_ANOMALIES.natures[this.filtre().nature]);
  protected readonly liste = resource({
    params: () => (this.pageDemandee() === undefined || this.natureDemandee() === undefined ? undefined : this.filtre()),
    loader: ({ params }) => this.port.list(params),
  });

  protected async filter(event: Event, operateur: string, element: string): Promise<void> {
    event.preventDefault();
    try {
      const navigue = await this.router.navigate(['/anomalies'], {
        queryParams: { nature: this.filtre().nature, operateur: operateur.trim(), element: element.trim(), page: 1 },
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
    return Math.ceil(total / PAGE_SIZE_ANOMALIES);
  }

  protected ongletParams(nature: NatureAnomalie): FiltreAnomalies {
    return { ...this.filtre(), nature, page: 1 };
  }

  protected operateurDe(ligne: { operateur: string; operateurId?: string }): string {
    return ligne.operateur || [this.libelles.operateurNonResolu, ligne.operateurId].join(' · ');
  }

  protected posteDe(ligne: { poste: string; posteId?: string }): string {
    return ligne.poste || (ligne.posteId ? this.libelles.posteNonResolu + ' · ' + ligne.posteId : this.libelles.sansPoste);
  }

  protected pageParams(page: number): FiltreAnomalies {
    return { ...this.filtre(), page };
  }
}
