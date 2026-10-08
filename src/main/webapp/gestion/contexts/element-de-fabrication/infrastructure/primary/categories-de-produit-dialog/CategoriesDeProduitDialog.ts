import { Icon } from '@/app/shared/design-system/infrastructure/primary/icon/icon';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { ErrorMessage } from '@/gestion/shared/design-system/infrastructure/primary/error-message/ErrorMessage';
import { TextField } from '@/gestion/shared/design-system/infrastructure/primary/text-field/TextField';
import { afterNextRender, Component, ElementRef, inject, Injector, OnInit, signal, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { CategorieDeProduit } from '../../../domain/CategorieDeProduit';
import { CategoriesDeProduitPort } from '../../../domain/CategoriesDeProduitPort';
import { FormulaireCategorieDeProduit } from '../../../domain/FormulaireCategorieDeProduit';
import { OrdreDesCategories } from '../../../domain/OrdreDesCategories';
import { OrdreIncomplet } from '../../../domain/OrdreIncomplet';
import { RefusSuppressionCategorie } from '../../../domain/RefusSuppressionCategorie';
import { LIBELLES_CATEGORIES_DE_PRODUIT, LIBELLES_SUPPRESSION_CATEGORIE } from '../LibellesElementsDeFabrication';

interface RefusDeSuppression {
  readonly categorie: CategorieDeProduit;
  readonly refus: RefusSuppressionCategorie;
}

@Component({
  selector: 'glm-categories-de-produit-dialog',
  templateUrl: './CategoriesDeProduitDialog.html',
  styleUrl: './CategoriesDeProduitDialog.css',
  imports: [ErrorMessage, Icon, TextField, MatDialogModule, MatButtonModule],
})
export class CategoriesDeProduitDialog implements OnInit {
  private readonly port = inject(CategoriesDeProduitPort);
  private readonly errors = inject(ErrorHandlerPort);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly libelles = LIBELLES_CATEGORIES_DE_PRODUIT;
  protected readonly libellesSuppression = LIBELLES_SUPPRESSION_CATEGORIE;
  protected readonly ordre = signal(new OrdreDesCategories([]));
  private readonly supprimables = signal<readonly CategorieDeProduit[]>([]);
  protected readonly deplacement = signal(false);
  protected readonly refusDeplacement = signal<OrdreIncomplet | undefined>(undefined);
  protected readonly erreurDeplacement = signal(false);
  protected readonly chargement = signal(true);
  protected readonly echec = signal(false);
  protected readonly ajout = signal(false);
  protected readonly formulaire = signal(FormulaireCategorieDeProduit.vide());
  protected readonly soumis = signal(false);
  protected readonly enregistrement = signal(false);
  protected readonly erreurTechnique = signal(false);
  protected readonly confirmation = signal<CategorieDeProduit | undefined>(undefined);
  protected readonly suppression = signal(false);
  protected readonly refusSuppression = signal<RefusDeSuppression | undefined>(undefined);
  protected readonly erreurSuppression = signal(false);
  private readonly annulationDeSuppression = viewChild<string, ElementRef<HTMLButtonElement>>('annulationDeSuppression', {
    read: ElementRef,
  });

  ngOnInit(): void {
    this.reload();
  }

  protected reload(): void {
    this.errors.observe(this.load());
  }

  protected ouvrirAjout(): void {
    this.ajout.set(true);
    afterNextRender(() => this.host.nativeElement.querySelector<HTMLInputElement>('#categorie-code')?.focus(), {
      injector: this.injector,
    });
  }

  protected fermerAjout(event?: Event): void {
    event?.stopPropagation();
    this.ajout.set(false);
    this.formulaire.set(FormulaireCategorieDeProduit.vide());
    this.soumis.set(false);
    this.erreurTechnique.set(false);
  }

  protected changeCode(code: string): void {
    this.formulaire.update(formulaire => formulaire.avecCode(code));
  }

  protected monter(categorie: CategorieDeProduit): void {
    this.errors.observe(this.reorder(this.ordre().apresMontee(categorie)));
  }

  protected descendre(categorie: CategorieDeProduit): void {
    this.errors.observe(this.reorder(this.ordre().apresDescente(categorie)));
  }

  protected estSupprimable(categorie: CategorieDeProduit): boolean {
    return this.supprimables().some(supprimable => supprimable.estLaMeme(categorie));
  }

  protected supprimer(categorie: CategorieDeProduit): void {
    this.confirmation.set(categorie);
    this.refusSuppression.set(undefined);
    this.erreurSuppression.set(false);
    afterNextRender(() => this.annulationDeSuppression()?.nativeElement.focus(), { injector: this.injector });
  }

  protected annulerSuppression(): void {
    this.confirmation.set(undefined);
    this.erreurSuppression.set(false);
  }

  protected confirmerSuppression(categorie: CategorieDeProduit): void {
    this.errors.observe(this.remove(categorie));
  }

  protected estEnConfirmation(categorie: CategorieDeProduit): boolean {
    return this.confirmation()?.estLaMeme(categorie) ?? false;
  }

  protected refusDe(categorie: CategorieDeProduit): RefusSuppressionCategorie | undefined {
    const refus = this.refusSuppression();
    return refus?.categorie.estLaMeme(categorie) === true ? refus.refus : undefined;
  }

  protected declarer(event: Event): void {
    event.preventDefault();
    this.errors.observe(this.declare());
  }

  private async load(): Promise<void> {
    this.chargement.set(true);
    this.echec.set(false);
    try {
      const categories = await this.port.categories();
      this.ordre.set(new OrdreDesCategories(categories.map(geree => geree.categorie)));
      this.supprimables.set(categories.filter(geree => geree.supprimable).map(geree => geree.categorie));
    } catch {
      this.echec.set(true);
    } finally {
      this.chargement.set(false);
    }
  }

  private async remove(categorie: CategorieDeProduit): Promise<void> {
    this.suppression.set(true);
    this.erreurSuppression.set(false);
    try {
      const resultat = await this.port.supprimer(categorie);
      this.confirmation.set(undefined);
      if (!resultat.ok) {
        this.refusSuppression.set({ categorie, refus: resultat.error });
      }
      await this.load();
    } catch (failure) {
      this.erreurSuppression.set(true);
      this.errors.handleError(failure);
    } finally {
      this.suppression.set(false);
    }
  }

  private async reorder(ordre: OrdreDesCategories): Promise<void> {
    this.deplacement.set(true);
    this.refusDeplacement.set(undefined);
    this.erreurDeplacement.set(false);
    try {
      const resultat = await this.port.reordonner(ordre);
      if (resultat.ok) {
        this.ordre.set(ordre);
      } else {
        this.refusDeplacement.set(resultat.error);
        await this.load();
      }
    } catch (failure) {
      this.erreurDeplacement.set(true);
      this.errors.handleError(failure);
    } finally {
      this.deplacement.set(false);
    }
  }

  private async declare(): Promise<void> {
    if (this.enregistrement()) return;
    this.soumis.set(true);
    const categorie = this.formulaire().produireCategorie();
    if (!categorie.ok) return;
    this.enregistrement.set(true);
    this.erreurTechnique.set(false);
    try {
      const resultat = await this.port.declarer(categorie.value);
      if (resultat.ok) {
        this.fermerAjout();
        await this.load();
      } else {
        this.formulaire.update(formulaire => formulaire.avecRefus(resultat.error));
      }
    } catch (failure) {
      this.erreurTechnique.set(true);
      this.errors.handleError(failure);
    } finally {
      this.enregistrement.set(false);
    }
  }
}
