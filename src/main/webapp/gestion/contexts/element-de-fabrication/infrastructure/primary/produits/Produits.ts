import { formatInstantNumericDateTime } from '@/app/shared/date-format/infrastructure/primary/DateFormats';
import { Icon } from '@/app/shared/design-system/infrastructure/primary/icon/icon';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { Result } from '@/app/shared/result/domain/Result';
import { ErrorMessage } from '@/gestion/shared/design-system/infrastructure/primary/error-message/ErrorMessage';
import { Component, computed, DestroyRef, inject, OnInit, signal, ViewContainerRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute, convertToParamMap, Router, RouterLink } from '@angular/router';
import { ActesDAtelierPort } from '../../../domain/ActesDAtelierPort';
import { CategorieDeProduit } from '../../../domain/CategorieDeProduit';
import { CategoriesDeProduitPort } from '../../../domain/CategoriesDeProduitPort';
import { CompteursDesCycles } from '../../../domain/CompteursDesCycles';
import { CycleDuProduit, CYCLES_DU_PRODUIT } from '../../../domain/CycleDuProduit';
import { ElementDeFabrication } from '../../../domain/ElementDeFabrication';
import { ElementsDeFabricationPort } from '../../../domain/ElementsDeFabricationPort';
import { EtatDAtelier } from '../../../domain/EtatDAtelier';
import { ProduitDansSonCycle } from '../../../domain/ProduitDansSonCycle';
import { RefusDActeDAtelier } from '../../../domain/RefusDActeDAtelier';
import { CriteresDesProduits, TAILLE_DES_PAGES } from '../../../domain/RequeteProduits';
import { SuiviDuProduitId } from '../../../domain/SuiviDuProduitId';
import { CategoriesDeProduitDialog } from '../categories-de-produit-dialog/CategoriesDeProduitDialog';
import { ConfirmationClotureDialog, ConfirmationClotureDialogData } from '../confirmation-cloture-dialog/ConfirmationClotureDialog';
import { ElementFormDialog, ElementFormDialogData } from '../element-form-dialog/ElementFormDialog';
import { LIBELLES_CATEGORIES_DE_PRODUIT, LIBELLES_ELEMENTS_DE_FABRICATION } from '../LibellesElementsDeFabrication';
import { adresseDeLaRequete, requeteDeLAdresse } from './AdresseDesProduits';

interface LigneDeProduit {
  readonly produit: ProduitDansSonCycle;
  readonly creeLe: string;
  readonly suivi?: SuiviDuProduitId;
  readonly etat?: EtatDAtelier;
  readonly etatLibelle?: string;
  readonly misALAtelierLe?: string;
  readonly clotureLe?: string;
  readonly clotureePar?: string;
}

const ligneDe = (produit: ProduitDansSonCycle): LigneDeProduit => {
  const creeLe = formatInstantNumericDateTime(produit.creeLe);
  const passage = produit.passage;
  switch (passage.cycle) {
    case 'EN_PREPARATION':
      return { produit, creeLe };
    case 'EN_ATELIER':
      return {
        produit,
        creeLe,
        suivi: passage.suivi,
        etat: passage.etat,
        etatLibelle: LIBELLES_ELEMENTS_DE_FABRICATION.etats[passage.etat],
        misALAtelierLe: formatInstantNumericDateTime(passage.misALAtelierLe),
      };
    case 'CLOTURE':
      return {
        produit,
        creeLe,
        misALAtelierLe: formatInstantNumericDateTime(passage.misALAtelierLe),
        clotureLe: formatInstantNumericDateTime(passage.clotureLe),
        clotureePar: LIBELLES_ELEMENTS_DE_FABRICATION.par(passage.clotureePar),
      };
  }
};

interface EtatProduits {
  readonly categories: readonly CategorieDeProduit[];
  readonly sansCategorie: boolean;
  readonly produits: readonly ProduitDansSonCycle[];
  readonly total: number;
  readonly compteurs: CompteursDesCycles | undefined;
  readonly chargement: boolean;
  readonly echec: boolean;
}

const COLONNES: Record<CycleDuProduit, readonly string[]> = {
  EN_PREPARATION: ['categorie', 'nom', 'reference', 'libelle', 'creeLe', 'actions'],
  EN_ATELIER: ['categorie', 'nom', 'reference', 'etat', 'misALAtelierLe', 'actions'],
  CLOTURE: ['categorie', 'nom', 'reference', 'misALAtelierLe', 'clotureLe', 'actions'],
};

@Component({
  selector: 'glm-produits',
  host: { 'data-selector': 'elements-page' },
  templateUrl: './Produits.html',
  styleUrl: './Produits.css',
  imports: [ErrorMessage, Icon, MatButtonModule, MatTableModule, RouterLink],
})
export class Produits implements OnInit {
  private readonly port = inject(ElementsDeFabricationPort);
  private readonly categoriesPort = inject(CategoriesDeProduitPort);
  private readonly actes = inject(ActesDAtelierPort);
  private readonly errors = inject(ErrorHandlerPort);
  private readonly dialogs = inject(MatDialog);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private lecture = 0;
  protected readonly libelles = LIBELLES_ELEMENTS_DE_FABRICATION;
  protected readonly libellesCategories = LIBELLES_CATEGORIES_DE_PRODUIT;
  protected readonly cycles = CYCLES_DU_PRODUIT;
  protected readonly etat = signal<EtatProduits>({
    categories: [],
    sansCategorie: false,
    produits: [],
    total: 0,
    compteurs: undefined,
    chargement: false,
    echec: false,
  });

  private readonly requete = signal(requeteDeLAdresse(convertToParamMap({})));
  protected readonly cycle = computed(() => this.requete().cycle);
  protected readonly filtre = computed(() => this.requete().categorie);
  protected readonly recherche = computed(() => this.requete().recherche);
  protected readonly page = computed(() => this.requete().page);
  protected readonly colonnes = computed(() => COLONNES[this.cycle()]);
  protected readonly lignes = computed(() => this.etat().produits.map(ligneDe));
  private readonly pages = computed(() => Math.ceil(this.etat().total / TAILLE_DES_PAGES));
  protected readonly paginationVisible = computed(() => this.etat().total > 0 && (this.cycle() === 'CLOTURE' || this.pages() > 1));
  protected readonly premierePage = computed(() => this.page() === 0);
  protected readonly dernierePage = computed(() => this.page() >= this.pages() - 1);
  protected readonly intervalle = computed(() => {
    const premier = this.page() * TAILLE_DES_PAGES;
    return this.libelles.pagination.intervalle(premier + 1, premier + this.etat().produits.length, this.etat().total);
  });
  protected readonly acteEnCours = signal<string | undefined>(undefined);
  protected readonly refusAction = signal<RefusDActeDAtelier | undefined>(undefined);
  protected readonly erreurAction = signal(false);
  protected readonly filtree = computed(() => this.filtre() !== undefined || this.recherche().trim() !== '');

  ngOnInit(): void {
    let premiereLecture = true;
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(parametres => {
      this.requete.set(requeteDeLAdresse(parametres));
      void this.load(premiereLecture);
      premiereLecture = false;
    });
  }

  protected reload(): void {
    void this.load(true);
  }

  protected choisirCycle(cycle: CycleDuProduit): void {
    this.afficher({ cycle, page: 0 });
  }

  protected choisirCategorie(categorie: CategorieDeProduit | undefined): void {
    this.afficher({ categorie, page: 0 });
  }

  protected rechercher(recherche: string): void {
    this.afficher({ recherche, page: 0 }, true);
  }

  protected pagePrecedente(): void {
    this.afficher({ page: this.page() - 1 });
  }

  protected pageSuivante(): void {
    this.afficher({ page: this.page() + 1 });
  }

  protected estFiltree(categorie: CategorieDeProduit): boolean {
    return this.filtre()?.estLaMeme(categorie) ?? false;
  }

  protected identifiantDe(produit: ProduitDansSonCycle): string {
    return produit.element.id.value;
  }

  protected mettreALAtelier(produit: ProduitDansSonCycle): void {
    this.errors.observe(this.agir(produit, () => this.actes.mettreALAtelier(produit.element.id)));
  }

  protected openCloture(produit: ProduitDansSonCycle, suivi: SuiviDuProduitId): void {
    const data: ConfirmationClotureDialogData = { numero: produit.element.numero(), suivi };
    const dialogRef = this.dialogs.open<ConfirmationClotureDialog, ConfirmationClotureDialogData, boolean>(ConfirmationClotureDialog, {
      data,
      viewContainerRef: this.viewContainerRef,
      width: '32rem',
      maxWidth: 'calc(100vw - 2rem)',
    });
    dialogRef.afterClosed().subscribe(cloture => {
      if (cloture === true) {
        void this.load(false);
      }
    });
  }

  protected openCreation(): void {
    const categories = this.etat().categories;
    this.openForm({ element: null, categories, categorie: categories.find(categorie => this.estFiltree(categorie)) }, () => {
      this.choisirCycle('EN_PREPARATION');
    });
  }

  protected openModification(element: ElementDeFabrication): void {
    this.openForm({ element }, () => {
      void this.load(false);
    });
  }

  protected openCategories(): void {
    const dialogRef = this.dialogs.open(CategoriesDeProduitDialog, {
      viewContainerRef: this.viewContainerRef,
      autoFocus: 'dialog',
      width: '32rem',
      maxWidth: 'calc(100vw - 2rem)',
    });
    dialogRef.afterClosed().subscribe(() => {
      this.reload();
    });
  }

  private async agir(produit: ProduitDansSonCycle, acte: () => Promise<Result<void, RefusDActeDAtelier>>): Promise<void> {
    this.refusAction.set(undefined);
    this.erreurAction.set(false);
    this.acteEnCours.set(produit.element.id.value);
    try {
      const resultat = await acte();
      if (resultat.ok) {
        void this.load(false);
      } else {
        this.refusAction.set(resultat.error);
      }
    } catch (failure) {
      this.erreurAction.set(true);
      this.errors.handleError(failure);
    } finally {
      this.acteEnCours.set(undefined);
    }
  }

  private afficher(changements: Partial<CriteresDesProduits>, remplacer = false): void {
    const actuelle = adresseDeLaRequete(this.requete());
    const suivante = adresseDeLaRequete(this.requete().avec(changements));
    if (JSON.stringify(suivante) === JSON.stringify(actuelle)) {
      void this.load(false);
      return;
    }
    void this.router.navigate([], { relativeTo: this.route, queryParams: suivante, replaceUrl: remplacer });
  }

  private openForm(data: ElementFormDialogData, apresEnregistrement: () => void): void {
    const dialogRef = this.dialogs.open<ElementFormDialog, ElementFormDialogData, boolean>(ElementFormDialog, {
      data,
      viewContainerRef: this.viewContainerRef,
      width: '36rem',
      maxWidth: 'calc(100vw - 2rem)',
    });
    dialogRef.afterClosed().subscribe(saved => {
      if (saved === true) {
        apresEnregistrement();
      }
    });
  }

  private async load(avecCategories: boolean): Promise<void> {
    const lecture = ++this.lecture;
    this.etat.update(etat => ({ ...etat, chargement: true, echec: false }));
    try {
      const requete = this.requete();
      const [categories, page, compteurs] = await Promise.all([
        this.categoriesSi(avecCategories),
        this.port.produits(requete),
        this.port.compteurs(requete),
      ]);
      if (lecture === this.lecture) {
        this.etat.update(etat => ({
          ...etat,
          ...(categories === undefined ? {} : { categories, sansCategorie: categories.length === 0 }),
          produits: page.elements,
          total: page.totalCount,
          compteurs,
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

  private async categoriesSi(avecCategories: boolean): Promise<readonly CategorieDeProduit[] | undefined> {
    if (!avecCategories) return undefined;
    const gerees = await this.categoriesPort.categories();
    return gerees.map(geree => geree.categorie);
  }
}
