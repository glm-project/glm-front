import { Icon } from '@/app/shared/design-system/infrastructure/primary/icon/icon';
import { Component, inject, OnInit, signal, ViewContainerRef } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { CoutHoraire } from '../../../domain/CoutHoraire';
import { PosteDeTravail } from '../../../domain/PosteDeTravail';
import { PostesPort } from '../../../domain/PostesPort';
import { RequetePostes } from '../../../domain/RequetePostes';
import {
  ConfirmationSuppressionPosteDialog,
  ConfirmationSuppressionPosteDialogData,
} from '../confirmation-suppression-poste-dialog/ConfirmationSuppressionPosteDialog';
import { PosteFormDialog, PosteFormDialogData } from '../poste-form-dialog/PosteFormDialog';

interface EtatPostes {
  readonly postes: readonly PosteDeTravail[];
  readonly totalElementsCount: number;
  readonly page: number;
  readonly taille: number;
  readonly chargement: boolean;
  readonly echec: boolean;
}

const paginatorLabels = (): MatPaginatorIntl =>
  Object.assign(new MatPaginatorIntl(), {
    itemsPerPageLabel: 'Postes par page',
    nextPageLabel: 'Page suivante',
    previousPageLabel: 'Page précédente',
    firstPageLabel: 'Première page',
    lastPageLabel: 'Dernière page',
    getRangeLabel: (page: number, taille: number, total: number): string =>
      total === 0 ? '0 poste' : `${page * taille + 1}–${Math.min((page + 1) * taille, total)} sur ${total}`,
  });

@Component({
  selector: 'glm-postes-de-travail',
  host: { 'data-selector': 'postes-page' },
  templateUrl: './PostesDeTravail.html',
  styleUrl: './PostesDeTravail.css',
  imports: [Icon, MatButtonModule, MatTableModule, MatPaginatorModule],
  providers: [{ provide: MatPaginatorIntl, useFactory: paginatorLabels }],
})
export class PostesDeTravail implements OnInit {
  private readonly port = inject(PostesPort);
  private lecture = 0;
  protected readonly etat = signal<EtatPostes>({
    postes: [],
    totalElementsCount: 0,
    page: 0,
    taille: 20,
    chargement: false,
    echec: false,
  });
  private readonly dialogs = inject(MatDialog);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
  protected readonly colonnes = ['libelle', 'nature', 'coutHoraire', 'actions'];

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

  protected openForm(poste: PosteDeTravail | null = null): void {
    const dialogRef = this.dialogs.open<PosteFormDialog, PosteFormDialogData, boolean>(PosteFormDialog, {
      data: { poste },
      viewContainerRef: this.viewContainerRef,
      width: '36rem',
      maxWidth: 'calc(100vw - 2rem)',
    });
    dialogRef.afterClosed().subscribe(saved => {
      if (saved) {
        void this.load();
      }
    });
  }

  protected confirmDeletion(poste: PosteDeTravail): void {
    const dialogRef = this.dialogs.open<ConfirmationSuppressionPosteDialog, ConfirmationSuppressionPosteDialogData, boolean>(
      ConfirmationSuppressionPosteDialog,
      {
        data: { poste },
        viewContainerRef: this.viewContainerRef,
        width: '32rem',
        maxWidth: 'calc(100vw - 2rem)',
        autoFocus: '[data-selector="poste-delete-cancel"]',
      },
    );
    dialogRef.afterClosed().subscribe(deleted => {
      if (deleted) {
        void this.reloadAfterDeletion();
      }
    });
  }

  private async load(): Promise<void> {
    const lecture = ++this.lecture;
    this.etat.update(etat => ({ ...etat, chargement: true, echec: false }));
    try {
      const page = await this.port.postes(new RequetePostes(this.etat().page, this.etat().taille));
      if (lecture === this.lecture) {
        this.etat.update(etat => ({ ...etat, postes: page.elements, totalElementsCount: page.totalCount }));
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

  private reloadAfterDeletion(): Promise<void> {
    if (this.isLastRowOnLaterPage()) {
      this.etat.update(etat => ({ ...etat, page: etat.page - 1 }));
    }
    return this.load();
  }

  private isLastRowOnLaterPage(): boolean {
    return this.etat().postes.length === 1 && this.etat().page > 0;
  }

  protected formatCout(cout: CoutHoraire | undefined): string {
    return cout === undefined ? 'Non renseigné' : this.currency.format(cout.value);
  }
}
