import { Icon } from '@/app/shared/design-system/infrastructure/primary/icon/icon';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { ErrorMessage } from '@/gestion/shared/design-system/infrastructure/primary/error-message/ErrorMessage';
import { Component, computed, inject, linkedSignal, resource, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ElementChiffre } from '../../../domain/element/ElementChiffre';
import { ElementChiffreId } from '../../../domain/element/ElementChiffreId';
import { ElementDisponible } from '../../../domain/element/ElementDisponible';
import { EnregistrementDeFichierPort } from '../../../domain/export/EnregistrementDeFichierPort';
import { FormatDExport } from '../../../domain/export/FormatDExport';
import { CoutDeRevient } from '../../../domain/rapport/CoutDeRevient';
import { CoutDeRevientPort } from '../../../domain/rapport/CoutDeRevientPort';
import { LigneDeCout } from '../../../domain/rapport/LigneDeCout';
import { LIBELLES_COUT_DE_REVIENT } from '../LibellesCoutDeRevient';
import { SelecteurElement } from '../selecteur-element/SelecteurElement';

export type EtatVueCoutDeRevient =
  | { readonly kind: 'CHARGEMENT' }
  | { readonly kind: 'ERREUR' }
  | { readonly kind: 'ELEMENT_INTROUVABLE' }
  | { readonly kind: 'SUCCES'; readonly element: ElementChiffreId; readonly rapport: CoutDeRevient };

const BOUTONS_D_EXPORT: readonly { readonly format: FormatDExport; readonly selecteur: string }[] = [
  { format: 'EXCEL', selecteur: 'cout-export-excel' },
  { format: 'PDF_SYNTHESE', selecteur: 'cout-export-pdf-synthese' },
  { format: 'PDF_DETAIL', selecteur: 'cout-export-pdf-detail' },
];

@Component({
  selector: 'glm-cout-de-revient',
  host: { 'data-selector': 'cout-de-revient-page' },
  templateUrl: './CoutDeRevientDeLElement.html',
  styleUrl: './CoutDeRevientDeLElement.css',
  imports: [ErrorMessage, SelecteurElement, Icon, MatButtonModule, RouterLink],
})
export class CoutDeRevientDeLElement {
  protected readonly libelles = LIBELLES_COUT_DE_REVIENT;
  protected readonly boutonsDExport = BOUTONS_D_EXPORT;

  private navigationVersion = 0;
  private readonly router = inject(Router);
  private readonly errors = inject(ErrorHandlerPort);
  private readonly route = inject(ActivatedRoute);
  private readonly port = inject(CoutDeRevientPort);
  private readonly enregistrement = inject(EnregistrementDeFichierPort);

  private readonly chemin = toSignal(this.route.paramMap, { requireSync: true });

  protected readonly element = computed<ElementChiffreId | undefined>(() => {
    const element = this.chemin().get('element');
    if (element === null) {
      return undefined;
    }
    return new ElementChiffreId(element);
  });

  protected readonly navigationFailure = linkedSignal({ source: computed(() => this.element()?.value), computation: () => false });

  protected readonly ligneDepliee = linkedSignal<string | undefined, string | null>({
    source: computed(() => this.element()?.value),
    computation: () => null,
  });

  protected readonly exportEnCours = linkedSignal<string | undefined, FormatDExport | undefined>({
    source: computed(() => this.element()?.value),
    computation: () => undefined,
  });

  protected readonly echecDExport = linkedSignal({ source: computed(() => this.element()?.value), computation: () => false });

  private readonly lecture = resource({
    params: () => this.element(),
    loader: ({ params }) => this.port.rapport(params),
  });

  protected readonly etat: Signal<EtatVueCoutDeRevient> = computed(() => {
    const element = this.element();
    if (element === undefined) {
      return { kind: 'ELEMENT_INTROUVABLE' };
    }
    return this.etatDeLaLecture(element);
  });

  protected readonly collection = resource({
    params: computed(() => (this.element() === undefined ? undefined : true)),
    loader: () => this.port.elementsDisponibles(),
  });

  protected readonly elementsDisponibles = computed(() => (this.collection.hasValue() ? this.collection.value() : []));

  protected readonly identite = computed<ElementChiffre | undefined>(() => {
    const vue = this.etat();
    if (vue.kind === 'SUCCES') {
      return vue.rapport.element;
    }
    return this.elementsDisponibles().find(element => element.id.value === this.element()?.value)?.identite;
  });

  protected choose(element: ElementDisponible): void {
    this.navigationFailure.set(false);
    this.navigationVersion += 1;
    this.errors.observe(this.navigateTo(element, this.navigationVersion));
  }

  private async navigateTo(element: ElementDisponible, version: number): Promise<void> {
    const depart = this.element()?.value;
    try {
      await this.router.navigate(['/couts-de-revient', element.id.value]);
    } catch (failure) {
      if (this.isObsoleteNavigation(version, depart)) {
        return;
      }
      this.errors.handleError(failure);
      this.navigationFailure.set(true);
    }
  }

  private isObsoleteNavigation(version: number, depart: string | undefined): boolean {
    return version !== this.navigationVersion || depart !== this.element()?.value;
  }

  protected reload(): void {
    this.lecture.reload();
  }

  protected cleDe(ligne: LigneDeCout): string {
    return this.libelles.nature(ligne.nature?.value);
  }

  protected basculerLaLigne(ligne: LigneDeCout): void {
    const cle = this.cleDe(ligne);
    this.ligneDepliee.update(courante => (courante === cle ? null : cle));
  }

  protected estDepliee(ligne: LigneDeCout): boolean {
    return this.ligneDepliee() === this.cleDe(ligne);
  }

  protected exporter(element: ElementChiffreId, format: FormatDExport): void {
    this.echecDExport.set(false);
    this.exportEnCours.set(format);
    void this.telecharger(element, format);
  }

  private async telecharger(element: ElementChiffreId, format: FormatDExport): Promise<void> {
    try {
      const fichier = await this.port.exporte(element, format);
      if (fichier === undefined) {
        this.lecture.reload();
        return;
      }
      this.enregistrement.enregistre(fichier);
    } catch {
      this.echecDExport.set(true);
    } finally {
      this.exportEnCours.set(undefined);
    }
  }

  private etatDeLaLecture(element: ElementChiffreId): EtatVueCoutDeRevient {
    if (this.lecture.isLoading()) {
      return { kind: 'CHARGEMENT' };
    }
    if (this.lecture.status() === 'error') {
      return { kind: 'ERREUR' };
    }
    const rapport = this.lecture.value();
    if (rapport === undefined) {
      return { kind: 'ELEMENT_INTROUVABLE' };
    }
    return { kind: 'SUCCES', element, rapport };
  }
}
