import { Icon } from '@/app/shared/design-system/infrastructure/primary/icon/icon';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { Component, inject, OnInit, ViewContainerRef } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { PostesCoordinator } from '../../../application/PostesCoordinator';
import { CoutHoraire } from '../../../domain/CoutHoraire';
import { PosteDeTravail } from '../../../domain/PosteDeTravail';
import { ConfirmationSuppressionPosteDialog } from '../confirmation-suppression-poste-dialog/ConfirmationSuppressionPosteDialog';
import { PosteFormDialog } from '../poste-form-dialog/PosteFormDialog';

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
  protected readonly coordinateur = inject(PostesCoordinator);
  private readonly dialogs = inject(MatDialog);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly errors = inject(ErrorHandlerPort);
  private readonly currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
  protected readonly colonnes = ['libelle', 'nature', 'coutHoraire', 'actions'];

  ngOnInit(): void {
    this.reload();
  }

  protected reload(): void {
    this.errors.observe(this.coordinateur.charger());
  }

  protected changePage(event: PageEvent): void {
    this.errors.observe(this.coordinateur.changerPage(event.pageIndex, event.pageSize));
  }

  protected openForm(poste: PosteDeTravail | null = null): void {
    this.dialogs.open<PosteFormDialog, PosteDeTravail | null, boolean>(PosteFormDialog, {
      data: poste,
      viewContainerRef: this.viewContainerRef,
      width: '36rem',
      maxWidth: 'calc(100vw - 2rem)',
    });
  }

  protected confirmDeletion(poste: PosteDeTravail): void {
    this.dialogs.open<ConfirmationSuppressionPosteDialog, PosteDeTravail, boolean>(ConfirmationSuppressionPosteDialog, {
      data: poste,
      viewContainerRef: this.viewContainerRef,
      width: '32rem',
      maxWidth: 'calc(100vw - 2rem)',
      autoFocus: '[data-selector="poste-delete-cancel"]',
    });
  }

  protected formatCout(cout: CoutHoraire | undefined): string {
    return cout === undefined ? 'Non renseigné' : this.currency.format(cout.value);
  }
}
