import { localCalendarDay } from '@/app/shared/date-format/infrastructure/primary/DateFormats';
import { Icon } from '@/app/shared/design-system/infrastructure/primary/icon/icon';
import { ErrorMessage } from '@/gestion/shared/design-system/infrastructure/primary/error-message/ErrorMessage';
import { Component, computed, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { JourACorriger } from '../../../domain/journee/JourACorriger';
import { JourneeACorriger } from '../../../domain/journee/JourneeACorriger';
import { JourneeACorrigerPort } from '../../../domain/journee/JourneeACorrigerPort';
import { OperateurDeLaJourneeId } from '../../../domain/journee/OperateurDeLaJourneeId';
import { ActivitesDuJour } from '../activites-du-jour/ActivitesDuJour';
import { FriseDuJour } from '../frise-du-jour/FriseDuJour';
import { LIBELLES_CORRECTION_DES_ACTIVITES } from '../LibellesCorrectionDesActivites';

export type EtatDeLaPage =
  | { readonly kind: 'ADRESSE_INVALIDE' }
  | { readonly kind: 'CHARGEMENT' }
  | { readonly kind: 'ERREUR' }
  | { readonly kind: 'OPERATEUR_INTROUVABLE' }
  | { readonly kind: 'SUCCES'; readonly journee: JourneeACorriger };

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
  imports: [ActivitesDuJour, ErrorMessage, FriseDuJour, Icon, MatButtonModule, RouterLink],
  templateUrl: './CorrigerLaJourneePage.html',
  styleUrl: './CorrigerLaJourneePage.css',
})
export class CorrigerLaJourneePage {
  protected readonly libelles = LIBELLES_CORRECTION_DES_ACTIVITES.page;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly port = inject(JourneeACorrigerPort);
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

  protected readonly entete = computed(() => {
    const jour = this.adresse()?.jour;
    return jour === undefined ? undefined : { jour, precedent: jour.precedent(), suivant: jour.suivant(this.aujourdhui) };
  });

  protected readonly etat = computed<EtatDeLaPage>(() => {
    if (this.adresse() === undefined) {
      return { kind: 'ADRESSE_INVALIDE' };
    }
    if (this.lecture.isLoading()) {
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

  private async lire(adresse: AdresseDeLaJournee | undefined, operateur: string): Promise<JourneeACorriger | undefined> {
    if (adresse !== undefined) {
      return this.port.lire(adresse.operateur, adresse.jour);
    }
    await this.router.navigate(['/operateurs', operateur, 'heures'], { replaceUrl: true });
    return undefined;
  }
}
