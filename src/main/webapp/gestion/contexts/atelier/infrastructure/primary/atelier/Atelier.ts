import { Icon } from '@/app/shared/design-system/infrastructure/primary/icon/icon';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { Component, inject, OnInit, signal, ViewContainerRef } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute } from '@angular/router';
import { AtelierPort } from '../../../domain/AtelierPort';
import { ElementALAtelier } from '../../../domain/ElementALAtelier';
import { ElementEngageId } from '../../../domain/ElementEngageId';
import { FiltreDAtelier } from '../../../domain/FiltreDAtelier';
import { RequeteAtelier } from '../../../domain/RequeteAtelier';
import { SuiviIntrouvable } from '../../../domain/SuiviIntrouvable';
import { ConfirmationClotureDialog, ConfirmationClotureDialogData } from '../confirmation-cloture-dialog/ConfirmationClotureDialog';
import { formatInstant } from '../formatInstant';
import { LIBELLES_ATELIER } from '../LibellesAtelier';
import { MiseALAtelierDialog, MiseALAtelierDialogData } from '../mise-a-l-atelier-dialog/MiseALAtelierDialog';

interface EtatAtelier {
  readonly elements: readonly ElementALAtelier[];
  readonly totalElementsCount: number;
  readonly page: number;
  readonly taille: number;
  readonly filtre: FiltreDAtelier;
  readonly chargement: boolean;
  readonly echec: boolean;
}

const PAGINATION = LIBELLES_ATELIER.pagination;

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
  selector: 'glm-atelier',
  host: { 'data-selector': 'atelier-page' },
  templateUrl: './Atelier.html',
  styleUrl: './Atelier.css',
  imports: [Icon, MatButtonModule, MatTableModule, MatPaginatorModule],
  providers: [{ provide: MatPaginatorIntl, useFactory: paginatorLabels }],
})
export class Atelier implements OnInit {
  private readonly port = inject(AtelierPort);
  private readonly dialogs = inject(MatDialog);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly route = inject(ActivatedRoute);
  private readonly errors = inject(ErrorHandlerPort);
  private lecture = 0;

  protected readonly libelles = LIBELLES_ATELIER;
  protected readonly filtres: readonly FiltreDAtelier[] = ['ACTIFS', 'CLOTURES'];
  protected readonly colonnes = ['type', 'nom', 'etat', 'engagement', 'cloture', 'actions'];
  protected readonly refusAction = signal<SuiviIntrouvable | undefined>(undefined);
  protected readonly erreurAction = signal(false);
  protected readonly etat = signal<EtatAtelier>({
    elements: [],
    totalElementsCount: 0,
    page: 0,
    taille: 20,
    filtre: 'ACTIFS',
    chargement: false,
    echec: false,
  });

  ngOnInit(): void {
    this.reload();
    const preselection = this.route.snapshot.queryParamMap.get('element');
    if (preselection !== null) {
      this.openEngagement(new ElementEngageId(preselection));
    }
  }

  protected reload(): void {
    void this.load();
  }

  protected changePage(event: PageEvent): void {
    this.etat.update(etat => ({ ...etat, page: event.pageIndex, taille: event.pageSize }));
    this.reload();
  }

  protected changeFiltre(filtre: FiltreDAtelier): void {
    this.etat.update(etat => ({ ...etat, filtre, page: 0 }));
    this.reload();
  }

  protected libelleDuFiltre(filtre: FiltreDAtelier): string {
    return this.libelles.filtres[filtre];
  }

  protected libelleDuType(element: ElementALAtelier): string {
    return this.libelles.types[element.type];
  }

  protected libelleDeLEtat(element: ElementALAtelier): string {
    return this.libelles.etats[element.etat];
  }

  protected engagementDe(element: ElementALAtelier): string {
    return formatInstant(element.engagement.instant);
  }

  protected auteurDeLEngagement(element: ElementALAtelier): string {
    return this.libelles.par(element.engagement.auteur);
  }

  protected clotureDe(element: ElementALAtelier): string {
    const cloture = element.cloture;
    return cloture === undefined ? this.libelles.sansValeur : formatInstant(cloture.instant);
  }

  protected auteurDeLaCloture(element: ElementALAtelier): string {
    const cloture = element.cloture;
    return cloture === undefined ? '' : this.libelles.par(cloture.auteur);
  }

  protected estCloture(element: ElementALAtelier): boolean {
    return element.estCloture();
  }

  protected openMiseALAtelier(): void {
    this.openEngagement(undefined);
  }

  protected openCloture(element: ElementALAtelier): void {
    const data: ConfirmationClotureDialogData = { element };
    const dialogRef = this.dialogs.open<ConfirmationClotureDialog, ConfirmationClotureDialogData, boolean>(ConfirmationClotureDialog, {
      data,
      viewContainerRef: this.viewContainerRef,
      width: '32rem',
      maxWidth: 'calc(100vw - 2rem)',
    });
    dialogRef.afterClosed().subscribe(cloture => {
      this.reloadWhen(cloture === true);
    });
  }

  protected rouvrir(element: ElementALAtelier): void {
    this.errors.observe(this.reopen(element));
  }

  private openEngagement(preselection: ElementEngageId | undefined): void {
    const data: MiseALAtelierDialogData = { preselection };
    const dialogRef = this.dialogs.open<MiseALAtelierDialog, MiseALAtelierDialogData, boolean>(MiseALAtelierDialog, {
      data,
      viewContainerRef: this.viewContainerRef,
      width: '44rem',
      maxWidth: 'calc(100vw - 2rem)',
    });
    dialogRef.afterClosed().subscribe(engage => {
      this.reloadWhen(engage === true);
    });
  }

  private reloadWhen(fait: boolean): void {
    if (fait) {
      this.etat.update(etat => ({ ...etat, filtre: 'ACTIFS', page: 0 }));
      this.reload();
    }
  }

  private async reopen(element: ElementALAtelier): Promise<void> {
    this.refusAction.set(undefined);
    this.erreurAction.set(false);
    try {
      const resultat = await this.port.rouvrir(element.suivi);
      if (resultat.ok) {
        this.reloadWhen(true);
      } else {
        this.refusAction.set(resultat.error);
      }
    } catch (failure) {
      this.erreurAction.set(true);
      this.errors.handleError(failure);
    }
  }

  private async load(): Promise<void> {
    const lecture = ++this.lecture;
    this.etat.update(etat => ({ ...etat, chargement: true, echec: false }));
    try {
      const page = await this.port.elements(new RequeteAtelier(this.etat().page, this.etat().taille, this.etat().filtre));
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
