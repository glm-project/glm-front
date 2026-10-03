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
import { RouterLink } from '@angular/router';
import { Identifiant } from '../../../domain/Identifiant';
import { Operateur } from '../../../domain/Operateur';
import { OperateursPort } from '../../../domain/OperateursPort';
import { PosteHabilitable } from '../../../domain/PosteHabilitable';
import { TauxHoraire } from '../../../domain/TauxHoraire';
import {
  ConfirmationSuppressionOperateurDialog,
  ConfirmationSuppressionOperateurDialogData,
} from '../confirmation-suppression-operateur-dialog/ConfirmationSuppressionOperateurDialog';
import { OperateurFormDialog, OperateurFormDialogData } from '../operateur-form-dialog/OperateurFormDialog';

interface EtatOperateurs {
  readonly operateurs: readonly Operateur[];
  readonly totalElementsCount: number;
  readonly page: number;
  readonly taille: number;
  readonly chargement: boolean;
  readonly echec: boolean;
  readonly atelierSansPoste: boolean;
}

@Component({
  selector: 'glm-operateurs',
  host: { 'data-selector': 'operateurs-page' },
  templateUrl: './Operateurs.html',
  styleUrl: './Operateurs.css',
  imports: [ErrorMessage, Icon, MatButtonModule, MatTableModule, MatPaginatorModule, RouterLink],
  providers: [
    {
      provide: MatPaginatorIntl,
      useFactory: () =>
        createPaginatorIntl({ ...DEFAULT_PAGINATOR_LABELS, itemsPerPageLabel: 'Opérateurs par page', emptyLabel: '0 opérateur' }),
    },
  ],
})
export class Operateurs implements OnInit {
  private readonly port = inject(OperateursPort);
  private lecture = 0;
  protected readonly etat = signal<EtatOperateurs>({
    operateurs: [],
    totalElementsCount: 0,
    page: 0,
    taille: 20,
    chargement: false,
    echec: false,
    atelierSansPoste: false,
  });
  private readonly dialogs = inject(MatDialog);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
  protected readonly colonnes = ['identite', 'identifiant', 'natures', 'postes', 'tauxHoraire', 'actions'];

  protected readonly recherche = signal('');
  protected readonly resultats = computed(() => {
    const recherche = this.recherche().trim().normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('fr-FR');
    return this.etat().operateurs.filter(entry => {
      const texte = [
        entry.nom.value,
        entry.prenom.value,
        entry.identifiant?.value,
        ...entry.natures,
        ...entry.postes.map(poste => poste.libelle),
      ];
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

  protected openForm(operateur: Operateur | null = null): void {
    const dialogRef = this.dialogs.open<OperateurFormDialog, OperateurFormDialogData, boolean>(OperateurFormDialog, {
      data: { operateur },
      viewContainerRef: this.viewContainerRef,
      width: '40rem',
      maxWidth: 'calc(100vw - 2rem)',
    });
    dialogRef.afterClosed().subscribe(saved => {
      if (saved) {
        void this.load();
      }
    });
  }

  protected confirmDeletion(operateur: Operateur): void {
    const dialogRef = this.dialogs.open<ConfirmationSuppressionOperateurDialog, ConfirmationSuppressionOperateurDialogData, boolean>(
      ConfirmationSuppressionOperateurDialog,
      {
        data: { operateur },
        viewContainerRef: this.viewContainerRef,
        width: '32rem',
        maxWidth: 'calc(100vw - 2rem)',
        autoFocus: '[data-selector="operateur-delete-cancel"]',
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
      const postes = await this.port.postesHabilitables();
      if (lecture === this.lecture) {
        this.etat.update(etat => ({
          ...etat,
          operateurs: entries,
          totalElementsCount: entries.length,
          atelierSansPoste: postes.length === 0,
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

  protected formatIdentifiant(identifiant: Identifiant | undefined): string {
    return identifiant?.value ?? 'Non renseigné';
  }

  protected formatTaux(taux: TauxHoraire | undefined): string {
    return taux === undefined ? 'Non renseigné' : this.currency.format(taux.value);
  }

  protected formatNatures(natures: readonly string[]): string {
    return natures.length === 0 ? 'Aucun' : natures.join(', ');
  }

  protected formatPostes(postes: readonly PosteHabilitable[]): string {
    return postes.length === 0 ? 'Aucune habilitation' : postes.map(poste => poste.libelle).join(', ');
  }
}
