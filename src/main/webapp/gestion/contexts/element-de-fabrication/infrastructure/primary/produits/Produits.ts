import { Icon } from '@/app/shared/design-system/infrastructure/primary/icon/icon';
import { ErrorMessage } from '@/gestion/shared/design-system/infrastructure/primary/error-message/ErrorMessage';
import { createPaginatorIntl } from '@/gestion/shared/design-system/infrastructure/primary/pagination/createPaginatorIntl';
import { Component, computed, inject, OnInit, signal, ViewContainerRef } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { CategorieDeProduit } from '../../../domain/CategorieDeProduit';
import { ElementDeFabrication } from '../../../domain/ElementDeFabrication';
import { ElementsDeFabricationPort } from '../../../domain/ElementsDeFabricationPort';
import { ElementFormDialog, ElementFormDialogData } from '../element-form-dialog/ElementFormDialog';
import { LIBELLES_ELEMENTS_DE_FABRICATION } from '../LibellesElementsDeFabrication';

interface EtatElements {
  readonly categories: readonly CategorieDeProduit[];
  readonly elements: readonly ElementDeFabrication[];
  readonly totalElementsCount: number;
  readonly page: number;
  readonly taille: number;
  readonly sansCategorie: boolean;
  readonly chargement: boolean;
  readonly echec: boolean;
}

const PAGINATION = LIBELLES_ELEMENTS_DE_FABRICATION.pagination;

@Component({
  selector: 'glm-produits',
  host: { 'data-selector': 'elements-page' },
  templateUrl: './Produits.html',
  styleUrl: './Produits.css',
  imports: [ErrorMessage, Icon, MatButtonModule, MatTableModule, MatPaginatorModule, RouterLink],
  providers: [
    {
      provide: MatPaginatorIntl,
      useFactory: () =>
        createPaginatorIntl({
          itemsPerPageLabel: PAGINATION.parPage,
          nextPageLabel: PAGINATION.suivante,
          previousPageLabel: PAGINATION.precedente,
          firstPageLabel: PAGINATION.premiere,
          lastPageLabel: PAGINATION.derniere,
          emptyLabel: PAGINATION.vide,
          formatRange: PAGINATION.intervalle,
        }),
    },
  ],
})
export class Produits implements OnInit {
  private readonly port = inject(ElementsDeFabricationPort);
  private readonly dialogs = inject(MatDialog);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private lecture = 0;
  protected readonly libelles = LIBELLES_ELEMENTS_DE_FABRICATION;
  protected readonly colonnes = ['categorie', 'reference', 'nom', 'libelle', 'actions'];
  protected readonly etat = signal<EtatElements>({
    categories: [],
    elements: [],
    totalElementsCount: 0,
    page: 0,
    taille: 20,
    sansCategorie: false,
    chargement: false,
    echec: false,
  });

  protected readonly filtre = signal<CategorieDeProduit | undefined>(undefined);

  protected choisirCategorie(categorie: CategorieDeProduit | undefined): void {
    this.filtre.set(categorie);
    this.etat.update(etat => ({ ...etat, page: 0 }));
  }

  protected readonly recherche = signal('');
  protected readonly resultats = computed(() => {
    const recherche = this.recherche().trim().normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('fr-FR');
    return this.etat().elements.filter(entry => {
      const texte = [entry.reference?.value, entry.nom.value, entry.libelle?.value];
      return (
        texte.join(' ').normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('fr-FR').includes(recherche)
        && this.correspondAuFiltre(entry)
      );
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

  protected estFiltree(categorie: CategorieDeProduit): boolean {
    return this.filtre()?.estLaMeme(categorie) ?? false;
  }

  protected identifiantDe(element: ElementDeFabrication): string {
    return element.id.value;
  }

  protected openCreation(categorie: CategorieDeProduit): void {
    this.openForm({ categorie, element: null });
  }

  protected openModification(element: ElementDeFabrication): void {
    this.openForm({ categorie: element.categorie, element });
  }

  private correspondAuFiltre(element: ElementDeFabrication): boolean {
    const filtre = this.filtre();
    return filtre === undefined || element.categorie.estLaMeme(filtre);
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
      const referentiel = await this.port.referentiel();
      if (lecture === this.lecture) {
        this.etat.update(etat => ({
          ...etat,
          categories: referentiel.categories,
          sansCategorie: referentiel.estSansCategorie(),
          elements: referentiel.elements,
          totalElementsCount: referentiel.elements.length,
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
}
