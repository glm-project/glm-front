import { Icon } from '@/app/shared/design-system/infrastructure/primary/icon/icon';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { TextField } from '@/gestion/shared/design-system/infrastructure/primary/text-field/TextField';
import { afterNextRender, Component, computed, ElementRef, inject, Injector, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { FormulaireNature } from '../../../domain/FormulaireNature';
import { NatureDeTravail } from '../../../domain/NatureDeTravail';
import { NatureGeree } from '../../../domain/NatureGeree';
import { NaturesDeTravailPort } from '../../../domain/NaturesDeTravailPort';

@Component({
  selector: 'glm-colonne-des-natures',
  templateUrl: './ColonneDesNatures.html',
  styleUrl: './ColonneDesNatures.css',
  imports: [Icon, MatButtonModule, TextField],
})
export class ColonneDesNatures {
  private readonly port = inject(NaturesDeTravailPort);
  private readonly errors = inject(ErrorHandlerPort);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly natures = input.required<readonly NatureGeree[]>();
  readonly choisie = input.required<NatureGeree | undefined>();
  readonly total = input.required<number>();
  readonly lue = input.required<boolean>();
  readonly choisir = output<NatureGeree | undefined>();
  readonly enregistree = output<NatureDeTravail>();

  protected readonly ajout = signal(false);
  protected readonly formulaire = signal(FormulaireNature.vide());
  protected readonly soumis = signal(false);
  protected readonly enregistrement = signal(false);
  protected readonly erreurTechnique = signal(false);
  protected readonly succes = signal<string | undefined>(undefined);
  private readonly decision = computed(() => this.formulaire().decider(this.natures()));
  protected readonly erreur = computed(() => {
    const decision = this.decision();
    return this.soumis() && decision.type === 'invalide' ? decision.erreur : undefined;
  });
  protected readonly proche = signal<NatureGeree | undefined>(undefined);
  protected readonly libelleEnregistrer = computed(() => {
    if (this.enregistrement()) {
      return 'Enregistrement…';
    }
    return this.proche() === undefined ? 'Enregistrer' : 'Enregistrer quand même';
  });

  protected ouvrirAjout(): void {
    this.ajout.set(true);
    this.succes.set(undefined);
    afterNextRender(() => this.host.nativeElement.querySelector<HTMLInputElement>('#nature-libelle')?.focus(), {
      injector: this.injector,
    });
  }

  protected fermerAjout(event?: Event): void {
    event?.stopPropagation();
    this.ajout.set(false);
    this.formulaire.set(FormulaireNature.vide());
    this.soumis.set(false);
    this.proche.set(undefined);
    this.erreurTechnique.set(false);
  }

  protected changeLibelle(libelle: string): void {
    this.formulaire.update(formulaire => formulaire.avecSaisie(libelle));
    this.proche.set(undefined);
  }

  protected enregistrer(event: Event): void {
    event.preventDefault();
    this.errors.observe(this.save());
  }

  private async save(): Promise<void> {
    if (this.proche() !== undefined) {
      this.formulaire.update(formulaire => formulaire.accepterRessemblance());
      this.proche.set(undefined);
    }
    this.soumis.set(true);
    const decision = this.decision();
    if (decision.type === 'ressemblante') {
      this.proche.set(decision.proche);
      return;
    }
    if (decision.type === 'invalide') return;
    this.enregistrement.set(true);
    this.erreurTechnique.set(false);
    try {
      const resultat = await this.port.enregistrer(decision.libelle);
      if (resultat.ok) {
        this.fermerAjout();
        this.succes.set(`Nature « ${decision.libelle.value} » enregistrée.`);
        this.enregistree.emit(decision.libelle);
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
