import { Icon } from '@/app/shared/design-system/infrastructure/primary/icon/icon';
import { Component, inject, OnInit, signal, ViewContainerRef } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { ElementDeFabrication } from '../../../domain/ElementDeFabrication';
import { ElementsDeFabricationPort } from '../../../domain/ElementsDeFabricationPort';
import { RequeteElements } from '../../../domain/RequeteElements';
import { TypeDElementDeFabrication } from '../../../domain/TypeDElementDeFabrication';
import { ElementFormDialog, ElementFormDialogData } from '../element-form-dialog/ElementFormDialog';
import { LIBELLES_ELEMENTS_DE_FABRICATION } from '../LibellesElementsDeFabrication';

interface EtatElements {
  readonly elements: readonly ElementDeFabrication[];
  readonly totalElementsCount: number;
  readonly page: number;
  readonly taille: number;
  readonly chargement: boolean;
  readonly echec: boolean;
}

const PAGINATION = LIBELLES_ELEMENTS_DE_FABRICATION.pagination;

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
  selector: 'glm-moules-et-of',
  host: { 'data-selector': 'elements-page' },
  templateUrl: './MoulesEtOf.html',
  styleUrl: './MoulesEtOf.css',
  imports: [Icon, MatButtonModule, MatTableModule, MatPaginatorModule],
  providers: [{ provide: MatPaginatorIntl, useFactory: paginatorLabels }],
})
export class MoulesEtOf implements OnInit {
  private readonly port = inject(ElementsDeFabricationPort);
  private readonly dialogs = inject(MatDialog);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private lecture = 0;
  protected readonly libelles = LIBELLES_ELEMENTS_DE_FABRICATION;
  protected readonly colonnes = ['type', 'reference', 'nom', 'libelle', 'actions'];
  protected readonly etat = signal<EtatElements>({
    elements: [],
    totalElementsCount: 0,
    page: 0,
    taille: 20,
    chargement: false,
    echec: false,
  });

  ngOnInit(): void {
    this.reload();
  }

  protected reload(): void {
    void this.load();
  }

  protected changePage(event: PageEvent): void {
    this.etat.update(etat => ({ ...etat, page: event.pageIndex, taille: event.pageSize }));
    this.reload();
  }

  protected libelleDuType(element: ElementDeFabrication): string {
    return this.libelles.types[element.type];
  }

  protected openCreation(type: TypeDElementDeFabrication): void {
    this.openForm({ type, element: null });
  }

  protected openModification(element: ElementDeFabrication): void {
    this.openForm({ type: element.type, element });
  }

  private openForm(data: ElementFormDialogData): void {
    const dialogRef = this.dialogs.open<ElementFormDialog, ElementFormDialogData, boolean>(ElementFormDialog, {
      data,
      viewContainerRef: this.viewContainerRef,
      width: '36rem',
      maxWidth: 'calc(100vw - 2rem)',
    });
    dialogRef.afterClosed().subscribe(saved => {
      if (saved === true) {
        void this.load();
      }
    });
  }

  private async load(): Promise<void> {
    const lecture = ++this.lecture;
    this.etat.update(etat => ({ ...etat, chargement: true, echec: false }));
    try {
      const page = await this.port.elements(new RequeteElements(this.etat().page, this.etat().taille));
      if (lecture === this.lecture) {
        this.etat.update(etat => ({ ...etat, elements: page.elements, totalElementsCount: page.totalCount }));
      }
    } catch {
      if (lecture === this.lecture) {
        this.etat.update(etat => ({ ...etat, echec: true }));
      }
    } finally {
      if (lecture === this.lecture) {
        this.etat.update(etat => ({ ...etat, chargement: false }));
      }
    }
  }
}
