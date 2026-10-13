import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { afterNextRender, Component, computed, DestroyRef, ElementRef, inject, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { CorrectionDUneActivite, IssueDeCorrection } from '../../../application/CorrectionDUneActivite';
import { MotifDeChangementDePoste } from '../../../domain/correction/CorrectionsPort';
import { ActiviteTerminee } from '../../../domain/journee/ActiviteDeLaJournee';
import { JourneeACorriger } from '../../../domain/journee/JourneeACorriger';
import { PosteDeLaJournee } from '../../../domain/journee/PosteDeLaJournee';
import { LIBELLES_CORRECTION_DES_ACTIVITES } from '../LibellesCorrectionDesActivites';

@Component({
  selector: 'glm-panneau-de-changement-de-poste',
  imports: [MatButtonModule],
  templateUrl: './PanneauDeChangementDePoste.html',
  styleUrls: ['../../../../../shared/design-system/infrastructure/primary/forms.css', './PanneauDeChangementDePoste.css'],
})
export class PanneauDeChangementDePoste {
  readonly journee = input.required<JourneeACorriger>();
  readonly activite = input.required<ActiviteTerminee>();
  readonly abandon = output();
  readonly corrigee = output<IssueDeCorrection>();

  private readonly correction = inject(CorrectionDUneActivite);
  private readonly errors = inject(ErrorHandlerPort);
  private readonly hote = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly libelles = LIBELLES_CORRECTION_DES_ACTIVITES.changement;
  protected readonly postes = computed(() => this.journee().postesPourChanger(this.activite()));
  private readonly identifiantChoisi = signal<string | undefined>(undefined);
  protected readonly choisi = computed<PosteDeLaJournee | undefined>(
    () => this.postes().find(poste => poste.id.value === this.identifiantChoisi()) ?? this.postes()[0],
  );
  protected readonly enCours = computed(() => this.correction.etat().kind === 'EN_COURS');
  protected readonly refus = signal<MotifDeChangementDePoste | undefined>(undefined);
  protected readonly echec = signal(false);

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.correction.abandonnerLeChangementDePoste();
    });
    afterNextRender(() => this.hote.nativeElement.querySelector<HTMLElement>('select, button')?.focus());
  }

  protected choisir(identifiant: string): void {
    this.identifiantChoisi.set(identifiant);
  }

  protected enregistrer(poste: PosteDeLaJournee): void {
    this.errors.observe(this.changer(poste));
  }

  private async changer(poste: PosteDeLaJournee): Promise<void> {
    await this.correction.changerDePoste(this.activite(), poste);
    const etat = this.correction.etat();
    this.refus.set(etat.kind === 'REFUSEE' ? etat.motif : undefined);
    this.echec.set(etat.kind === 'ECHEC');
    if (etat.kind === 'A_RELIRE') {
      this.corrigee.emit(etat.issue);
    }
  }
}
