import { Component, computed, inject, resource, signal, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ElementChiffreId } from '../../../domain/element/ElementChiffreId';
import { CoutDeRevient } from '../../../domain/rapport/CoutDeRevient';
import { CoutDeRevientPort } from '../../../domain/rapport/CoutDeRevientPort';
import { LigneDeCout } from '../../../domain/rapport/LigneDeCout';
import { LIBELLES_COUT_DE_REVIENT } from '../LibellesCoutDeRevient';

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
  imports: [MatButtonModule, RouterLink],
})
export class CoutDeRevientDeLElement {
  protected readonly libelles = LIBELLES_COUT_DE_REVIENT;

  /** La ligne dont le détail daté est déplié. Le tableau chiffre ; les dates se lisent d'un geste. */
  protected readonly ligneDepliee = signal<string | null>(null);

  private readonly route = inject(ActivatedRoute);
  private readonly port = inject(CoutDeRevientPort);

  private readonly chemin = toSignal(this.route.paramMap, { requireSync: true });

  /** Une adresse sans élément laisse la ressource au repos : Angular n'appelle pas le loader quand `params` est `undefined`. */
  private readonly element = computed<ElementChiffreId | undefined>(() => {
    const element = this.chemin().get('element');
    if (element === null) {
      return undefined;
    }
    return new ElementChiffreId(element);
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

  protected reload(): void {
    this.lecture.reload();
  }

  /** La clé de dépliage : la nature, ou le mot qui désigne la ligne sans poste — il n'y en a qu'une. */
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
