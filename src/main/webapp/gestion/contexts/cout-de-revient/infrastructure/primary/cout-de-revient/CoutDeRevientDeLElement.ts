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
import { CoutDeRevient } from '../../../domain/rapport/CoutDeRevient';
import { CoutDeRevientPort } from '../../../domain/rapport/CoutDeRevientPort';
import { LigneDeCout } from '../../../domain/rapport/LigneDeCout';
import { LIBELLES_COUT_DE_REVIENT } from '../LibellesCoutDeRevient';
import { SelecteurElement } from '../selecteur-element/SelecteurElement';

export type EtatVueCoutDeRevient =
  | { readonly kind: 'CHARGEMENT' }
  | { readonly kind: 'ERREUR' }
  | { readonly kind: 'ELEMENT_INTROUVABLE' }
  | { readonly kind: 'SUCCES'; readonly rapport: CoutDeRevient };

@Component({
  selector: 'glm-cout-de-revient',
  host: { 'data-selector': 'cout-de-revient-page' },
  templateUrl: './CoutDeRevientDeLElement.html',
  styleUrl: './CoutDeRevientDeLElement.css',
  imports: [ErrorMessage, SelecteurElement, Icon, MatButtonModule, RouterLink],
})
export class CoutDeRevientDeLElement {
  protected readonly libelles = LIBELLES_COUT_DE_REVIENT;

  private navigationVersion = 0;
  private readonly router = inject(Router);
  private readonly errors = inject(ErrorHandlerPort);
  private readonly route = inject(ActivatedRoute);
  private readonly port = inject(CoutDeRevientPort);

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

  private readonly lecture = resource({
    params: () => this.element(),
    loader: ({ params }) => this.port.rapport(params),
  });

  protected readonly etat: Signal<EtatVueCoutDeRevient> = computed(() => {
    if (this.element() === undefined) {
      return { kind: 'ELEMENT_INTROUVABLE' };
    }
    return this.etatDeLaLecture();
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

  private etatDeLaLecture(): EtatVueCoutDeRevient {
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
    return { kind: 'SUCCES', rapport };
  }
}
