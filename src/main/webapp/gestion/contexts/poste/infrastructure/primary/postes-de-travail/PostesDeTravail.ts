import { Icon } from '@/app/shared/design-system/infrastructure/primary/icon/icon';
import { ErrorMessage } from '@/gestion/shared/design-system/infrastructure/primary/error-message/ErrorMessage';
import {
  createPaginatorIntl,
  DEFAULT_PAGINATOR_LABELS,
} from '@/gestion/shared/design-system/infrastructure/primary/pagination/createPaginatorIntl';
import { Component, computed, inject, OnInit, signal, ViewContainerRef } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { CoutHoraire } from '../../../domain/CoutHoraire';
import { PosteDeTravail } from '../../../domain/PosteDeTravail';
import { PostesPort } from '../../../domain/PostesPort';
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

@Component({
  selector: 'glm-postes-de-travail',
  host: { 'data-selector': 'postes-page' },
  templateUrl: './PostesDeTravail.html',
  styleUrl: './PostesDeTravail.css',
  imports: [ErrorMessage, Icon, MatButtonModule, MatTableModule, MatPaginatorModule],
  providers: [
    {
      provide: MatPaginatorIntl,
      useFactory: () => createPaginatorIntl({ ...DEFAULT_PAGINATOR_LABELS, itemsPerPageLabel: 'Postes par page', emptyLabel: '0 poste' }),
    },
  ],
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

  protected readonly recherche = signal('');
  protected readonly resultats = computed(() => {
    const recherche = this.recherche().trim().normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('fr-FR');
    return this.etat().postes.filter(entry => {
      const texte = [entry.libelle.value, entry.nature.value];
      return texte.join(' ').normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('fr-FR').includes(recherche);
    });
  });
  protected readonly affiches = computed(() =>
    this.resultats().slice(this.etat().page * this.etat().taille, (this.etat().page + 1) * this.etat().taille),
  );

  protected rechercher(value: string): void {
    this.recherche.set(value);
    this.etat.update(etat => ({ ...etat, page: 0 }));
  }

  ngOnInit(): void {
    this.reload();
  }

  protected reload(): void {
    void this.load();
  }

  protected changePage(event: PageEvent): void {
    this.etat.update(etat => ({ ...etat, page: event.pageIndex, taille: event.pageSize }));
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
      const entries = await this.port.referentiel();
      if (lecture === this.lecture) {
        this.etat.update(etat => ({
          ...etat,
          postes: entries,
          totalElementsCount: entries.length,
        }));
        this.etat.update(etat => ({
          ...etat,
          page: Math.min(etat.page, Math.max(0, Math.ceil(this.resultats().length / etat.taille) - 1)),
        }));
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
    return this.affiches().length === 1 && this.etat().page > 0;
  }

  protected formatCout(cout: CoutHoraire | undefined): string {
    return cout === undefined ? 'Non renseigné' : this.currency.format(cout.value);
  }
}
