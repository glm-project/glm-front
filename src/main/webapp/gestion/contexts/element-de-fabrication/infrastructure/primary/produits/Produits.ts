import { formatInstantNumericDateTime, localCalendarDay } from '@/app/shared/date-format/infrastructure/primary/DateFormats';
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
import { ElementDeFabricationId } from '../../../domain/ElementDeFabricationId';
import { ElementsDeFabricationPort } from '../../../domain/ElementsDeFabricationPort';
import { EtatDAtelier } from '../../../domain/EtatDAtelier';
import { bornesDeCloture, periodeLibre, PrereglageDeCloture, PREREGLAGES_DE_CLOTURE } from '../../../domain/PeriodeDeCloture';
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
  readonly aCloturer?: SuiviDuProduitId;
  readonly aRouvrir?: SuiviDuProduitId;
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
        aCloturer: passage.suivi,
        etat: passage.etat,
        etatLibelle: LIBELLES_ELEMENTS_DE_FABRICATION.etats[passage.etat],
        misALAtelierLe: formatInstantNumericDateTime(passage.misALAtelierLe),
      };
    case 'CLOTURE':
      return {
        produit,
        creeLe,
        aRouvrir: passage.suivi,
        misALAtelierLe: formatInstantNumericDateTime(passage.misALAtelierLe),
        clotureLe: formatInstantNumericDateTime(passage.clotureLe),
        clotureePar: LIBELLES_ELEMENTS_DE_FABRICATION.par(passage.clotureePar),
      };
  }
};

interface Annonce {
  readonly texte: string;
  readonly cycle: CycleDuProduit;
  readonly element: string;
}

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
  protected readonly prereglages = PREREGLAGES_DE_CLOTURE;
  private readonly aujourdhui = new Date();
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
  private readonly bornes = computed(() => bornesDeCloture(this.requete().cloture, this.aujourdhui));
  protected readonly du = computed(() => localCalendarDay(this.bornes().debut));
  protected readonly au = computed(() => localCalendarDay(this.bornes().fin));
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
  protected readonly annonce = signal<Annonce | undefined>(undefined);
  protected readonly surligne = signal<string | undefined>(undefined);
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

  protected choisirPrereglage(prereglage: PrereglageDeCloture): void {
    this.afficher({ cloture: { prereglage }, page: 0 });
  }

  protected choisirDu(jour: string): void {
    this.choisirJours(jour, this.au());
  }

  protected choisirAu(jour: string): void {
    this.choisirJours(this.du(), jour);
  }

  protected estPrereglage(prereglage: PrereglageDeCloture): boolean {
    const cloture = this.requete().cloture;
    return 'prereglage' in cloture && cloture.prereglage === prereglage;
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
    const annonce = this.annonceDe(produit, 'EN_ATELIER', this.libelles.annonces.misALAtelier);
    this.errors.observe(this.agir(produit, () => this.actes.mettreALAtelier(produit.element.id), annonce));
  }

  protected rouvrir(produit: ProduitDansSonCycle, suivi: SuiviDuProduitId): void {
    const annonce = this.annonceDe(produit, 'EN_ATELIER', this.libelles.annonces.rouvert);
    this.errors.observe(this.agir(produit, () => this.actes.rouvrir(suivi), annonce));
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
        this.annonce.set(this.annonceDe(produit, 'CLOTURE', this.libelles.annonces.cloture));
        void this.load(false);
      }
    });
  }

  protected openCreation(): void {
    const categories = this.etat().categories;
    this.openForm({ element: null, categories, categorie: categories.find(categorie => this.estFiltree(categorie)) }, cree => {
      this.choisirCycle('EN_PREPARATION');
      this.surligne.set(cree.value);
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

  protected voir(annonce: Annonce): void {
    this.annonce.set(undefined);
    this.afficher({ cycle: annonce.cycle, page: 0 });
    this.surligne.set(annonce.element);
  }

  protected fermerAnnonce(): void {
    this.annonce.set(undefined);
  }

  protected estSurligne(produit: ProduitDansSonCycle): boolean {
    return produit.element.id.value === this.surligne();
  }

  private annonceDe(produit: ProduitDansSonCycle, cycle: CycleDuProduit, texte: (numero: string) => string): Annonce {
    return { texte: texte(produit.element.numero()), cycle, element: produit.element.id.value };
  }

  private async agir(produit: ProduitDansSonCycle, acte: () => Promise<Result<void, RefusDActeDAtelier>>, annonce: Annonce): Promise<void> {
    this.annonce.set(undefined);
    this.refusAction.set(undefined);
    this.erreurAction.set(false);
    this.acteEnCours.set(produit.element.id.value);
    try {
      const resultat = await acte();
      if (resultat.ok) {
        this.annonce.set(annonce);
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

  private choisirJours(du: string, au: string): void {
    const cloture = periodeLibre(du, au);
    if (cloture !== undefined) {
      this.afficher({ cloture, page: 0 });
    }
  }

  private afficher(changements: Partial<CriteresDesProduits>, remplacer = false): void {
    this.surligne.set(undefined);
    const actuelle = adresseDeLaRequete(this.requete());
    const suivante = adresseDeLaRequete(this.requete().avec(changements));
    if (JSON.stringify(suivante) === JSON.stringify(actuelle)) {
      void this.load(false);
      return;
    }
    void this.router.navigate([], { relativeTo: this.route, queryParams: suivante, replaceUrl: remplacer });
  }

  private openForm(data: ElementFormDialogData, apresEnregistrement: (element: ElementDeFabricationId) => void): void {
    const dialogRef = this.dialogs.open<ElementFormDialog, ElementFormDialogData, ElementDeFabricationId | false>(ElementFormDialog, {
      data,
      viewContainerRef: this.viewContainerRef,
      width: '36rem',
      maxWidth: 'calc(100vw - 2rem)',
    });
    dialogRef.afterClosed().subscribe(enregistre => {
      if (enregistre instanceof ElementDeFabricationId) {
        apresEnregistrement(enregistre);
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
