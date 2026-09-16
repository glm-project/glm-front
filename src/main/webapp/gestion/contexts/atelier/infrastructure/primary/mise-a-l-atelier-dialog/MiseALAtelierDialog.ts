import { Icon } from '@/app/shared/design-system/infrastructure/primary/icon/icon';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { AtelierPort } from '../../../domain/AtelierPort';
import { ElementEngageable } from '../../../domain/ElementEngageable';
import { ElementEngageId } from '../../../domain/ElementEngageId';
import { ElementsEngageablesPort } from '../../../domain/ElementsEngageablesPort';
import { RefusMiseALAtelier } from '../../../domain/RefusMiseALAtelier';
import { RequeteEngageables } from '../../../domain/RequeteEngageables';
import { LIBELLES_ATELIER, LIBELLES_MISE_A_L_ATELIER } from '../LibellesAtelier';

export interface MiseALAtelierDialogData {
  readonly preselection: ElementEngageId | undefined;
}

type VueMiseALAtelier =
  | { readonly kind: 'CHARGEMENT' }
  | { readonly kind: 'ECHEC' }
  | { readonly kind: 'INTROUVABLE' }
  | { readonly kind: 'CANDIDAT'; readonly element: ElementEngageable }
  | { readonly kind: 'CHOIX'; readonly elements: readonly ElementEngageable[]; readonly total: number };

const PAGINATION = LIBELLES_MISE_A_L_ATELIER.pagination;

const paginatorLabels = (): MatPaginatorIntl =>
  Object.assign(new MatPaginatorIntl(), {
    itemsPerPageLabel: PAGINATION.parPage,
    nextPageLabel: PAGINATION.suivante,
    previousPageLabel: PAGINATION.precedente,
    firstPageLabel: PAGINATION.premiere,
    lastPageLabel: PAGINATION.derniere,
    getRangeLabel: (page: number, taille: number, total: number): string =>
      total === 0 ? PAGINATION.vide : PAGINATION.intervalle(page * taille + 1, Math.min((page + 1) * taille, total), total),
  });

@Component({
  selector: 'glm-mise-a-l-atelier-dialog',
  templateUrl: './MiseALAtelierDialog.html',
  styleUrl: './MiseALAtelierDialog.css',
  imports: [Icon, MatDialogModule, MatButtonModule, MatTableModule, MatPaginatorModule],
  providers: [{ provide: MatPaginatorIntl, useFactory: paginatorLabels }],
})
export class MiseALAtelierDialog implements OnInit {
  private readonly data = inject<MiseALAtelierDialogData>(MAT_DIALOG_DATA);
  private readonly dialog = inject<MatDialogRef<MiseALAtelierDialog, boolean>>(MatDialogRef);
  private readonly atelier = inject(AtelierPort);
  private readonly referentiel = inject(ElementsEngageablesPort);
  private readonly errors = inject(ErrorHandlerPort);

  protected readonly libelles = LIBELLES_MISE_A_L_ATELIER;
  protected readonly colonnes = ['type', 'designation', 'actions'];
  protected readonly vue = signal<VueMiseALAtelier>({ kind: 'CHARGEMENT' });
  protected readonly page = signal(0);
  protected readonly taille = signal(20);
  protected readonly candidat = computed(() => {
    const vue = this.vue();
    return vue.kind === 'CANDIDAT' ? vue.element : undefined;
  });
  protected readonly choix = computed(() => {
    const vue = this.vue();
    return vue.kind === 'CHOIX' ? vue : undefined;
  });
  protected readonly engagement = signal(false);
  protected readonly refus = signal<RefusMiseALAtelier | undefined>(undefined);
  protected readonly erreurTechnique = signal(false);

  ngOnInit(): void {
    this.reload();
  }

  protected reload(): void {
    this.errors.observe(this.load());
  }

  protected changePage(event: PageEvent): void {
    this.page.set(event.pageIndex);
    this.taille.set(event.pageSize);
    this.reload();
  }

  protected libelleDuType(element: ElementEngageable): string {
    return LIBELLES_ATELIER.types[element.type];
  }

  protected engager(element: ElementEngageable): void {
    this.errors.observe(this.engage(element.id));
  }

  private async load(): Promise<void> {
    this.vue.set({ kind: 'CHARGEMENT' });
    try {
      this.vue.set(await this.read());
    } catch (failure) {
      this.vue.set({ kind: 'ECHEC' });
      this.errors.handleError(failure);
    }
  }

  private async read(): Promise<VueMiseALAtelier> {
    const preselection = this.data.preselection;
    if (preselection !== undefined) {
      const element = await this.referentiel.element(preselection);
      return element === undefined ? { kind: 'INTROUVABLE' } : { kind: 'CANDIDAT', element };
    }
    const resultat = await this.referentiel.elements(new RequeteEngageables(this.page(), this.taille()));
    return { kind: 'CHOIX', elements: resultat.elements, total: resultat.totalCount };
  }

  private async engage(element: ElementEngageId): Promise<void> {
    if (this.engagement()) return;
    this.engagement.set(true);
    this.refus.set(undefined);
    this.erreurTechnique.set(false);
    this.dialog.disableClose = true;
    try {
      const resultat = await this.atelier.mettreALAtelier(element);
      if (resultat.ok) {
        this.dialog.close(true);
      } else {
        this.refus.set(resultat.error);
      }
    } catch (failure) {
      this.erreurTechnique.set(true);
      this.errors.handleError(failure);
    } finally {
      this.engagement.set(false);
      this.dialog.disableClose = false;
    }
  }
}
