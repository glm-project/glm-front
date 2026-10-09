import { Component, computed, inject, linkedSignal, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { adresseDossier } from '../../../domain/dossier/AdresseDossier';
import { AnomaliesReadPort } from '../../../domain/dossier/AnomaliesReadPort';
import { AdresseDossier } from '../../../domain/dossier/DossierAnomalie';
import { LIBELLES_ANOMALIES } from '../LibellesAnomalies';
import { ResolutionDeFin } from './vues-de-resolution/resolution-de-fin/ResolutionDeFin';

@Component({
  selector: 'glm-dossier-anomalie',
  imports: [ResolutionDeFin, RouterLink],
  templateUrl: './DossierAnomaliePage.html',
  styleUrls: ['../Boutons.css'],
})
export class DossierAnomaliePage {
  private readonly route = inject(ActivatedRoute);
  private readonly port = inject(AnomaliesReadPort);
  private readonly chemin = toSignal(this.route.paramMap, { requireSync: true });
  private readonly parametres = toSignal(this.route.queryParamMap, { requireSync: true });
  protected readonly now = new Date();
  protected readonly libelles = LIBELLES_ANOMALIES;
  protected readonly adresse = computed(() => adresseDossier(this.chemin().get('suivi'), this.parametres().get('pointage')));
  protected readonly retour = computed(() => ({
    operateur: this.parametres().get('operateur'),
    element: this.parametres().get('element'),
    page: this.parametres().get('page'),
  }));
  protected readonly lecture = resource({ params: () => ({ adresse: this.adresse() }), loader: ({ params }) => this.read(params.adresse) });
  protected readonly operateurs = resource({ loader: () => this.port.operateurs() });
  protected readonly operateursConnus = computed(() => (this.operateurs.hasValue() ? this.operateurs.value() : undefined));
  protected readonly resultatLecture = computed(() => (this.lecture.error() ? undefined : this.lecture.value()));
  protected readonly dossier = computed(() => {
    if (this.lecture.isLoading()) return undefined;
    const lecture = this.resultatLecture();
    return lecture?.kind === 'DOSSIER' ? lecture.dossier : undefined;
  });

  protected readonly resolution = computed(() => {
    const dossier = this.dossier();
    const adresse = this.adresse();
    return dossier === undefined || adresse === undefined ? undefined : { dossier, adresse };
  });
  protected readonly dossierRelu = linkedSignal({ source: this.adresse, computation: () => false });

  private read(adresse: AdresseDossier | undefined) {
    return adresse === undefined ? Promise.resolve(undefined) : this.port.read(adresse);
  }

  protected reload(): void {
    this.lecture.reload();
  }

  protected relire(): void {
    this.dossierRelu.set(true);
    this.lecture.reload();
  }
}
