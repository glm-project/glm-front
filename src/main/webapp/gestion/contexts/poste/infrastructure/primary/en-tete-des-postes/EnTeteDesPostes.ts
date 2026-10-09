import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { Result } from '@/app/shared/result/domain/Result';
import { TextField } from '@/gestion/shared/design-system/infrastructure/primary/text-field/TextField';
import { afterNextRender, Component, computed, ElementRef, inject, Injector, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { FormulaireNature } from '../../../domain/FormulaireNature';
import { NatureDejaExistante } from '../../../domain/NatureDejaExistante';
import { NatureDeTravail } from '../../../domain/NatureDeTravail';
import { NatureGeree } from '../../../domain/NatureGeree';
import { NaturesDeTravailPort } from '../../../domain/NaturesDeTravailPort';
import { RefusRenommageNature } from '../../../domain/RefusRenommageNature';

interface Renommage {
  readonly nature: NatureGeree;
  readonly formulaire: FormulaireNature;
}

@Component({
  selector: 'glm-en-tete-des-postes',
  templateUrl: './EnTeteDesPostes.html',
  imports: [MatButtonModule, TextField],
})
export class EnTeteDesPostes {
  private readonly port = inject(NaturesDeTravailPort);
  private readonly errors = inject(ErrorHandlerPort);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly nature = input.required<NatureGeree | undefined>();
  readonly natures = input.required<readonly NatureGeree[]>();
  readonly total = input.required<number>();
  readonly modifiee = output();

  protected readonly renommage = signal<Renommage | undefined>(undefined);
  protected readonly soumis = signal(false);
  protected readonly enregistrement = signal(false);
  protected readonly erreurTechnique = signal(false);
  protected readonly proche = signal<NatureGeree | undefined>(undefined);
  protected readonly message = signal<string | undefined>(undefined);
  protected readonly refus = signal<string | undefined>(undefined);

  protected readonly compte = computed(() => {
    const postes = this.nature()?.postes ?? this.total();
    if (postes === 0) {
      return 'aucun poste';
    }
    return postes === 1 ? '1 poste' : `${String(postes)} postes`;
  });
  private readonly decision = computed(() => {
    const renommage = this.renommage();
    return renommage?.formulaire.decider(this.natures(), renommage.nature.id);
  });
  protected readonly erreur = computed(() => {
    const decision = this.decision();
    return this.soumis() && decision?.type === 'invalide' ? decision.erreur : undefined;
  });
  protected readonly libelleEnregistrer = computed(() => {
    if (this.enregistrement()) {
      return 'Enregistrement…';
    }
    return this.proche() === undefined ? 'Enregistrer' : 'Enregistrer quand même';
  });

  protected ouvrirRenommage(nature: NatureGeree): void {
    this.renommage.set({ nature, formulaire: FormulaireNature.pour(nature.libelle) });
    this.message.set(undefined);
    this.refus.set(undefined);
    afterNextRender(() => this.host.nativeElement.querySelector<HTMLInputElement>('#nature-nouveau-libelle')?.select(), {
      injector: this.injector,
    });
  }

  protected fermerRenommage(event?: Event): void {
    event?.stopPropagation();
    this.renommage.set(undefined);
    this.soumis.set(false);
    this.proche.set(undefined);
    this.erreurTechnique.set(false);
  }

  protected changeLibelle(libelle: string): void {
    this.modifierFormulaire(formulaire => formulaire.avecSaisie(libelle));
    this.proche.set(undefined);
  }

  protected renommer(event: Event, renommage: Renommage): void {
    event.preventDefault();
    this.errors.observe(this.save(renommage.nature));
  }

  private async save(nature: NatureGeree): Promise<void> {
    const libelle = this.libellePret();
    if (libelle === undefined) return;
    this.enregistrement.set(true);
    this.erreurTechnique.set(false);
    try {
      this.appliquer(nature, libelle, await this.port.renommer(nature.id, libelle));
    } catch (failure) {
      this.erreurTechnique.set(true);
      this.errors.handleError(failure);
    } finally {
      this.enregistrement.set(false);
    }
  }

  private libellePret(): NatureDeTravail | undefined {
    if (this.proche() !== undefined) {
      this.modifierFormulaire(formulaire => formulaire.accepterRessemblance());
      this.proche.set(undefined);
    }
    this.soumis.set(true);
    const decision = this.decision();
    if (decision?.type === 'ressemblante') {
      this.proche.set(decision.proche);
      return undefined;
    }
    return decision?.type === 'prete' ? decision.libelle : undefined;
  }

  private appliquer(nature: NatureGeree, libelle: NatureDeTravail, resultat: Result<void, RefusRenommageNature>): void {
    if (resultat.ok) {
      this.fermerRenommage();
      this.message.set(`« ${nature.libelle.value} » s'appelle désormais « ${libelle.value} ».`);
      this.modifiee.emit();
      return;
    }
    const refus = resultat.error;
    if (refus instanceof NatureDejaExistante) {
      this.modifierFormulaire(formulaire => formulaire.avecRefus(refus));
      return;
    }
    this.fermerRenommage();
    this.refus.set(refus.message);
    this.modifiee.emit();
  }

  private modifierFormulaire(transformation: (formulaire: FormulaireNature) => FormulaireNature): void {
    this.renommage.update(renommage => renommage && { ...renommage, formulaire: transformation(renommage.formulaire) });
  }
}
