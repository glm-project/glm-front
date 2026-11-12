import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { ErrorMessage } from '@/gestion/shared/design-system/infrastructure/primary/error-message/ErrorMessage';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  resource,
  signal,
  untracked,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { CorrectionDUneActivite, IssueDeCorrection } from '../../../application/CorrectionDUneActivite';
import { MotifDeRegularisation } from '../../../domain/correction/CorrectionsPort';
import { DossierDeLaFin } from '../../../domain/fin-automatique/DossierDeLaFin';
import { DossierDeLaFinPort } from '../../../domain/fin-automatique/DossierDeLaFinPort';
import { InstantDuDossier } from '../../../domain/fin-automatique/InstantDuDossier';
import { ActiviteTerminee } from '../../../domain/journee/ActiviteDeLaJournee';
import { instantDeplace, uneMinuteEntiereEntre } from '../frise-de-la-fin/DeplacementDeLaPoignee';
import { FriseDeLaFin } from '../frise-de-la-fin/FriseDeLaFin';
import {
  bornesDuFait,
  DeplacementDemande,
  limiteDuDossier,
  PlacementDemande,
  placementDuDossier,
  poigneeDuDossier,
} from '../frise-de-la-fin/PoigneeDeFrise';
import { heureDe } from '../frise-de-la-fin/PresentationDeLaFrise';
import { LIBELLES_CORRECTION_DES_ACTIVITES } from '../LibellesCorrectionDesActivites';

@Component({
  selector: 'glm-panneau-de-regularisation',
  imports: [ErrorMessage, FriseDeLaFin, MatButtonModule],
  templateUrl: './PanneauDeRegularisation.html',
  styleUrl: './PanneauDeRegularisation.css',
})
export class PanneauDeRegularisation {
  readonly activite = input.required<ActiviteTerminee>();
  readonly abandon = output();
  readonly corrigee = output<IssueDeCorrection>();

  private readonly port = inject(DossierDeLaFinPort);
  private readonly correction = inject(CorrectionDUneActivite);
  private readonly errors = inject(ErrorHandlerPort);
  private readonly hote = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly libelles = LIBELLES_CORRECTION_DES_ACTIVITES.regularisation;
  protected readonly horaires = LIBELLES_CORRECTION_DES_ACTIVITES.changement.horaires;
  protected readonly now = new Date();
  private readonly maintenant = signal(new Date().toISOString());
  private readonly instant = signal('');

  private readonly lecture = resource({
    params: () => `${this.activite().suivi.value}/${this.activite().id.value}`,
    loader: () => this.lire(),
  });

  protected readonly vue = computed(() => {
    const dossier = this.lecture.hasValue() ? this.lecture.value() : undefined;
    return dossier === undefined
      ? undefined
      : {
          dossier,
          poignee: poigneeDuDossier(dossier, this.instant(), this.maintenant()),
          placement: placementDuDossier(dossier, this.instant(), this.maintenant()),
          limite: limiteDuDossier(dossier, this.maintenant()),
        };
  });
  protected readonly enChargement = computed(() => this.lecture.isLoading());
  protected readonly enCours = computed(() => this.correction.etat().kind === 'EN_COURS');
  protected readonly finPlacee = computed(() => (new InstantDuDossier(this.instant()).isValid() ? this.instant() : undefined));
  protected readonly libelleDeValider = computed(() => {
    const fin = this.finPlacee();
    return fin === undefined ? this.libelles.validerSansHeure : this.libelles.validerLaFin(heureDe(fin));
  });
  protected readonly refus = signal<MotifDeRegularisation | undefined>(undefined);
  protected readonly echec = signal(false);
  protected readonly enErreur = computed(() => this.lecture.status() === 'error');

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.correction.abandonnerLaRegularisation();
    });
    afterNextRender(() => this.hote.nativeElement.querySelector<HTMLElement>('button')?.focus());
  }

  protected relire(): void {
    this.lecture.reload();
  }

  protected deplacer(dossier: DossierDeLaFin, { demande, poignee }: DeplacementDemande): void {
    this.lireLHorloge();
    this.instant.set(instantDeplace(demande, poignee.instant, bornesDuFait(dossier, this.maintenant())));
  }

  protected placer(dossier: DossierDeLaFin, { demande }: PlacementDemande): void {
    this.lireLHorloge();
    const bornes = bornesDuFait(dossier, this.maintenant());
    this.instant.set(uneMinuteEntiereEntre(bornes) ? instantDeplace(demande, this.maintenant(), bornes) : '');
  }

  protected valider(): void {
    this.errors.observe(this.regulariser(this.instant()));
  }

  private async regulariser(fin: string): Promise<void> {
    await this.correction.regulariserLaFin(this.activite(), fin);
    const etat = this.correction.etat();
    this.refus.set(etat.kind === 'REGULARISATION_REFUSEE' ? etat.motif : undefined);
    this.echec.set(etat.kind === 'ECHEC');
    if (etat.kind === 'A_RELIRE') {
      this.corrigee.emit(etat.issue);
    }
  }

  private lireLHorloge(): void {
    this.maintenant.set(new Date().toISOString());
  }

  private async lire(): Promise<DossierDeLaFin | undefined> {
    const activite = untracked(this.activite);
    const lecture = await this.port.lire(activite.suivi, activite.id);
    if (lecture.kind === 'INTROUVABLE') {
      this.corrigee.emit('JOURNEE_CHANGEE');
      return undefined;
    }
    return lecture.dossier;
  }
}
