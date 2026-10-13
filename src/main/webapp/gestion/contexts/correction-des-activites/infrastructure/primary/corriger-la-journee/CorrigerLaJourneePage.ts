import { localCalendarDay } from '@/app/shared/date-format/infrastructure/primary/DateFormats';
import { Icon } from '@/app/shared/design-system/infrastructure/primary/icon/icon';
import { ErrorMessage } from '@/gestion/shared/design-system/infrastructure/primary/error-message/ErrorMessage';
import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  linkedSignal,
  resource,
  viewChild,
  ViewContainerRef,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { CorrectionDUneActivite, IssueDeCorrection } from '../../../application/CorrectionDUneActivite';
import { ActiviteTerminee } from '../../../domain/journee/ActiviteDeLaJournee';
import { ActiviteDeLaJourneeId } from '../../../domain/journee/ActiviteDeLaJourneeId';
import { JourACorriger } from '../../../domain/journee/JourACorriger';
import { JourneeACorriger } from '../../../domain/journee/JourneeACorriger';
import { JourneeACorrigerPort } from '../../../domain/journee/JourneeACorrigerPort';
import { OperateurDeLaJourneeId } from '../../../domain/journee/OperateurDeLaJourneeId';
import { ActivitesDuJour } from '../activites-du-jour/ActivitesDuJour';
import { FriseDuJour } from '../frise-du-jour/FriseDuJour';
import { LIBELLES_CORRECTION_DES_ACTIVITES } from '../LibellesCorrectionDesActivites';
import { PanneauDeChangementDePoste } from '../panneau-de-changement-de-poste/PanneauDeChangementDePoste';
import { DonneesDuRetrait, RetraitDeLActivite } from '../retrait-de-l-activite/RetraitDeLActivite';

export type EtatDeLaPage =
  | { readonly kind: 'ADRESSE_INVALIDE' }
  | { readonly kind: 'CHARGEMENT' }
  | { readonly kind: 'ERREUR' }
  | { readonly kind: 'OPERATEUR_INTROUVABLE' }
  | { readonly kind: 'SUCCES'; readonly journee: JourneeACorriger };

interface AnnonceDeCorrection {
  readonly texte: string;
  readonly numero: number;
}

interface AdresseDeLaJournee {
  readonly operateur: OperateurDeLaJourneeId;
  readonly jour: JourACorriger;
}

const operateurDe = (chemin: ParamMap): string => {
  const operateur = chemin.get('operateur');
  if (operateur === null) {
    throw new Error('La route de la journée à corriger ne nomme aucun opérateur.');
  }
  return operateur;
};

@Component({
  selector: 'glm-corriger-la-journee',
  host: { 'data-selector': 'corriger-page' },
  imports: [ActivitesDuJour, ErrorMessage, FriseDuJour, Icon, MatButtonModule, PanneauDeChangementDePoste, RouterLink],
  templateUrl: './CorrigerLaJourneePage.html',
  styleUrl: './CorrigerLaJourneePage.css',
  providers: [CorrectionDUneActivite],
})
export class CorrigerLaJourneePage {
  protected readonly libelles = LIBELLES_CORRECTION_DES_ACTIVITES.page;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialogs = inject(MatDialog);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly injector = inject(Injector);
  private readonly message = viewChild<ElementRef<HTMLElement>>('message');
  private numeroDAnnonce = 0;
  private readonly port = inject(JourneeACorrigerPort);
  private readonly correction = inject(CorrectionDUneActivite);
  private readonly aujourdhui = new JourACorriger(localCalendarDay(new Date()));
  private readonly chemin = toSignal(this.route.paramMap, { requireSync: true });

  protected readonly operateur = computed(() => operateurDe(this.chemin()));

  private readonly adresse = computed<AdresseDeLaJournee | undefined>(() => {
    const jour = JourACorriger.demande(this.chemin().get('jour'), this.aujourdhui);
    return jour === undefined ? undefined : { operateur: new OperateurDeLaJourneeId(this.operateur()), jour };
  });

  private readonly lecture = resource({
    params: () => ({ adresse: this.adresse(), operateur: this.operateur() }),
    loader: ({ params }) => this.lire(params.adresse, params.operateur),
  });

  private readonly annonce = linkedSignal<AdresseDeLaJournee | undefined, AnnonceDeCorrection | undefined>({
    source: this.adresse,
    computation: () => undefined,
  });

  private readonly activiteEnChangement = linkedSignal<AdresseDeLaJournee | undefined, ActiviteDeLaJourneeId | undefined>({
    source: this.adresse,
    computation: () => undefined,
  });

  protected readonly annonces = computed(() => {
    const annonce = this.annonce();
    return annonce === undefined ? [] : [annonce];
  });

  protected readonly envoiEnCours = computed(() => this.correction.etat().kind === 'EN_COURS');
  protected readonly relecture = computed(() => this.lecture.status() === 'reloading');

  protected readonly entete = computed(() => {
    const jour = this.adresse()?.jour;
    return jour === undefined ? undefined : { jour, precedent: jour.precedent(), suivant: jour.suivant(this.aujourdhui) };
  });

  private readonly enPremierChargement = computed(
    () => this.lecture.status() === 'loading' || (this.lecture.status() === 'reloading' && !this.lecture.hasValue()),
  );

  protected readonly etat = computed<EtatDeLaPage>(() => {
    if (this.adresse() === undefined) {
      return { kind: 'ADRESSE_INVALIDE' };
    }
    if (this.enPremierChargement()) {
      return { kind: 'CHARGEMENT' };
    }
    if (this.lecture.status() === 'error') {
      return { kind: 'ERREUR' };
    }
    const journee = this.lecture.value();
    return journee === undefined ? { kind: 'OPERATEUR_INTROUVABLE' } : { kind: 'SUCCES', journee };
  });

  protected readonly identite = computed(() => {
    const etat = this.etat();
    return etat.kind === 'SUCCES' ? this.libelles.identite(etat.journee.operateur.nom, etat.journee.operateur.prenom) : undefined;
  });

  protected readonly retour = computed(() => {
    const jour = this.adresse()?.jour;
    return { commandes: ['/operateurs', this.operateur(), 'heures'], parametres: jour === undefined ? {} : { jour: jour.value } };
  });

  protected reload(): void {
    this.lecture.reload();
  }

  protected panneauDe(journee: JourneeACorriger): { readonly journee: JourneeACorriger; readonly activite: ActiviteTerminee } | undefined {
    const identifiant = this.activiteEnChangement();
    const activite = identifiant === undefined ? undefined : journee.activiteCorrigeable(identifiant);
    return activite === undefined ? undefined : { journee, activite };
  }

  protected ouvrirLeChangementDePoste(activite: ActiviteTerminee): void {
    this.activiteEnChangement.set(activite.id);
  }

  protected abandonnerLeChangementDePoste(activite: ActiviteTerminee, liste: ActivitesDuJour): void {
    this.activiteEnChangement.set(undefined);
    this.rendreLeFocusAuBoutonDe(activite, liste);
  }

  protected changementDePosteCorrige(activite: ActiviteTerminee, issue: IssueDeCorrection, liste: ActivitesDuJour): void {
    this.activiteEnChangement.set(undefined);
    this.relire(LIBELLES_CORRECTION_DES_ACTIVITES.changement.annonce[issue]);
    this.rendreLeFocusAuBoutonDe(activite, liste);
  }

  protected retirer(journee: JourneeACorriger, activite: ActiviteTerminee): void {
    const donnees: DonneesDuRetrait = { journee, activite };
    const dialogue = this.dialogs.open<RetraitDeLActivite, DonneesDuRetrait, IssueDeCorrection>(RetraitDeLActivite, {
      data: donnees,
      viewContainerRef: this.viewContainerRef,
      width: '32rem',
      maxWidth: 'calc(100vw - 2rem)',
    });
    dialogue.afterClosed().subscribe(issue => {
      if (issue !== undefined) {
        this.fermerLeChangementDeLActiviteRetiree(activite);
        this.relire(LIBELLES_CORRECTION_DES_ACTIVITES.retrait.annonce[issue]);
        this.donnerLeFocusAuMessage();
      }
    });
  }

  private fermerLeChangementDeLActiviteRetiree(activite: ActiviteTerminee): void {
    if (this.activiteEnChangement()?.value === activite.id.value) {
      this.activiteEnChangement.set(undefined);
    }
  }

  private relire(texte: string): void {
    this.numeroDAnnonce += 1;
    this.annonce.set({ texte, numero: this.numeroDAnnonce });
    this.lecture.reload();
  }

  private donnerLeFocusAuMessage(): void {
    afterNextRender(() => this.message()?.nativeElement.focus(), { injector: this.injector });
  }

  private rendreLeFocusAuBoutonDe(activite: ActiviteTerminee, liste: ActivitesDuJour): void {
    afterNextRender(
      () => {
        liste.donnerLeFocusAuChangementDePoste(activite.id);
      },
      { injector: this.injector },
    );
  }

  private async lire(adresse: AdresseDeLaJournee | undefined, operateur: string): Promise<JourneeACorriger | undefined> {
    if (adresse !== undefined) {
      return this.port.lire(adresse.operateur, adresse.jour);
    }
    await this.router.navigate(['/operateurs', operateur, 'heures'], { replaceUrl: true });
    return undefined;
  }
}
