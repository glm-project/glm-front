import { NgComponentOutlet } from '@angular/common';
import { Component, computed, inject, linkedSignal, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PreparationActe } from '../../../application/PreparationActe';
import { adresseDossier } from '../../../domain/dossier/AdresseDossier';
import { AnomaliesReadPort } from '../../../domain/dossier/AnomaliesReadPort';
import { AdresseDossier, DossierAnomalie } from '../../../domain/dossier/DossierAnomalie';
import { LIBELLES_ANOMALIES } from '../LibellesAnomalies';
import { LectureDuDossier } from './vues-de-resolution/LectureDuDossier';
import { AiguillageSimple, aiguiller } from './vues-de-resolution/VuesDeResolution';

@Component({
  selector: 'glm-dossier-anomalie',
  imports: [NgComponentOutlet, RouterLink],
  templateUrl: './DossierAnomaliePage.html',
  styleUrls: ['../Boutons.css'],
  providers: [PreparationActe],
})
export class DossierAnomaliePage {
  private readonly route = inject(ActivatedRoute);
  private readonly port = inject(AnomaliesReadPort);
  private readonly preparation = inject(PreparationActe);
  private readonly chemin = toSignal(this.route.paramMap, { requireSync: true });
  private readonly parametres = toSignal(this.route.queryParamMap, { requireSync: true });
  private precedente: AdresseDossier | undefined;
  protected readonly now = new Date();
  protected readonly libelles = LIBELLES_ANOMALIES;
  protected readonly adresse = computed(() => adresseDossier(this.chemin().get('suivi'), this.parametres().get('pointage')));
  private readonly cleDeLAdresse = computed(() => {
    const adresse = this.adresse();
    return adresse === undefined ? '' : `${adresse.suivi.suivi}/${adresse.pointage.pointage}`;
  });
  protected readonly retour = computed(() => ({
    nature: this.parametres().get('nature'),
    operateur: this.parametres().get('operateur'),
    element: this.parametres().get('element'),
    page: this.parametres().get('page'),
  }));
  protected readonly lecture = resource({ params: () => ({ adresse: this.adresse() }), loader: ({ params }) => this.read(params.adresse) });
  protected readonly referentiel = resource({ loader: () => this.port.referentiel() });
  protected readonly referentielConnu = computed(() => (this.referentiel.hasValue() ? this.referentiel.value() : undefined));
  protected readonly resultatLecture = computed(() => (this.lecture.error() ? undefined : this.lecture.value()));
  protected readonly dossier = computed(() => {
    if (this.lecture.isLoading()) return undefined;
    const lecture = this.resultatLecture();
    return lecture?.kind === 'DOSSIER' ? lecture.dossier : undefined;
  });
  protected readonly vueDeResolution = linkedSignal<
    { readonly cle: string; readonly dossier: DossierAnomalie | undefined },
    AiguillageSimple | undefined
  >({
    source: () => ({ cle: this.cleDeLAdresse(), dossier: this.dossier() }),
    computation: ({ cle, dossier }, precedent) => {
      const figee = precedent?.source.cle === cle ? precedent.value : undefined;
      return figee ?? (dossier === undefined ? undefined : aiguiller(dossier));
    },
  });
  protected readonly lectureDuDossier: LectureDuDossier = {
    relire: adresse => this.relire(adresse),
    remplacerPar: dossier => {
      this.remplacerPar(dossier);
    },
  };

  private read(adresse: AdresseDossier | undefined) {
    if (adresse === undefined) {
      this.precedente = undefined;
      this.preparation.contextChanged();
      return Promise.resolve(undefined);
    }
    if (!this.sameAddress(adresse)) this.preparation.contextChanged();
    this.precedente = adresse;
    return this.port.read(adresse);
  }

  private sameAddress(adresse: AdresseDossier): boolean {
    return this.precedente?.suivi.suivi === adresse.suivi.suivi && this.precedente.pointage.pointage === adresse.pointage.pointage;
  }

  private async relire(adresse: AdresseDossier): Promise<DossierAnomalie | undefined> {
    try {
      const lecture = await this.port.read(adresse);
      this.lecture.value.set(lecture);
      return lecture.kind === 'DOSSIER' ? lecture.dossier : undefined;
    } catch {
      this.lecture.reload();
      return undefined;
    }
  }

  private remplacerPar(dossier: DossierAnomalie): void {
    this.lecture.value.set({ kind: 'DOSSIER', dossier });
  }

  protected reload(): void {
    this.lecture.reload();
  }
}
