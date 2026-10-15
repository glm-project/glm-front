import { Icon } from '@/app/shared/design-system/infrastructure/primary/icon/icon';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { ErrorMessage } from '@/gestion/shared/design-system/infrastructure/primary/error-message/ErrorMessage';
import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, linkedSignal, resource, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IdentiteOperateur } from '../../../domain/releve/IdentiteOperateur';
import { JourAOuvrir, jourOuvert } from '../../../domain/releve/JourOuvert';
import { OperateurReleveId } from '../../../domain/releve/OperateurReleveId';
import { ReleveDesHeures } from '../../../domain/releve/ReleveDesHeures';
import { DemandeDeReleve, SyntheseDesHeuresPort } from '../../../domain/releve/SyntheseDesHeuresPort';
import { jourDemande } from '../../../domain/semaine/JourDemande';
import { semaineDemandee } from '../../../domain/semaine/SemaineDemandee';
import { SemaineISO } from '../../../domain/semaine/SemaineISO';
import { jourCourant } from '../jourCourant';
import { Journal } from '../journal-du-jour/Journal';
import { LIBELLES_RELEVE_DES_HEURES } from '../LibellesReleveDesHeures';
import { SelecteurOperateur } from '../selecteur-operateur/SelecteurOperateur';
import { FriseDeLaSemaine, friseDeLaSemaine } from './FriseDeLaSemaine';

const ANNEES_OFFERTES = 6;

export type EtatVueSynthese =
  | { readonly kind: 'ADRESSE_INVALIDE' }
  | { readonly kind: 'CHARGEMENT' }
  | { readonly kind: 'ERREUR' }
  | { readonly kind: 'OPERATEUR_INTROUVABLE' }
  | {
      readonly kind: 'SUCCES';
      readonly semaine: SemaineISO;
      readonly releve: ReleveDesHeures;
      readonly frise: FriseDeLaSemaine;
    };

interface Consultation {
  readonly demande: DemandeDeReleve;
  readonly semaine: SemaineISO;
  readonly jour: JourAOuvrir;
}

const semaineOfferte = (semaine: SemaineISO | undefined, courante: SemaineISO): SemaineISO | undefined =>
  semaine !== undefined && !semaine.estApres(courante) ? semaine : undefined;

const derniereSemaineDe = (annee: number, courante: SemaineISO): number =>
  annee === courante.annee ? courante.numero : SemaineISO.nombreDeSemaines(annee);

@Component({
  selector: 'glm-synthese-des-heures',
  host: { 'data-selector': 'synthese-page' },
  templateUrl: './SyntheseDesHeures.html',
  styleUrl: './SyntheseDesHeures.css',
  imports: [ErrorMessage, SelecteurOperateur, Icon, Journal, MatButtonModule, NgTemplateOutlet, RouterLink],
})
export class SyntheseDesHeures {
  protected readonly libelles = LIBELLES_RELEVE_DES_HEURES;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private navigationVersion = 0;
  private readonly errors = inject(ErrorHandlerPort);
  private readonly port = inject(SyntheseDesHeuresPort);

  private readonly aujourdhui = jourCourant();
  private readonly semaineCourante = SemaineISO.contenant(this.aujourdhui);

  private readonly parametres = toSignal(this.route.queryParamMap, { requireSync: true });
  private readonly chemin = toSignal(this.route.paramMap, { requireSync: true });

  protected readonly operateur = computed(() => this.chemin().get('operateur'));

  private readonly demandee = computed(() =>
    semaineDemandee(
      {
        annee: this.parametres().get('annee') ?? undefined,
        semaine: this.parametres().get('semaine') ?? undefined,
        jour: this.parametres().get('jour') ?? undefined,
      },
      jourCourant(),
    ),
  );

  protected readonly semaine = computed<SemaineISO | undefined>(() => {
    const demandee = this.demandee();
    return demandee.estConnue ? demandee.semaine : undefined;
  });

  private readonly consultation = computed<Consultation | undefined>(() => {
    const semaine = this.semaine();
    const operateur = this.operateur();
    if (semaine === undefined) {
      return undefined;
    }
    if (operateur === null) {
      return undefined;
    }
    const jour = jourDemande(this.parametres().get('jour') ?? undefined, semaine);
    if (jour.kind === 'REFUSE') {
      return undefined;
    }
    return { demande: new DemandeDeReleve(new OperateurReleveId(operateur), semaine), semaine, jour };
  });

  private readonly demande = computed(() => this.consultation()?.demande, { equal: (une, autre) => une?.estLaMeme(autre) === true });

  private readonly releve = resource({
    params: this.demande,
    loader: ({ params }) => this.port.synthese(params),
  });

  private readonly listeDemandee = linkedSignal({
    source: () => this.consultation() !== undefined,
    computation: (valide, precedente) => valide || precedente?.value === true,
  });

  protected readonly operateurs = resource({
    params: computed(() => (this.listeDemandee() ? true : undefined)),
    loader: () => this.port.operateurs(),
    defaultValue: [],
  });

  private readonly pointageChoisi = linkedSignal<Consultation | undefined, number | undefined>({
    source: this.consultation,
    computation: () => undefined,
  });

  protected readonly echecNavigation = linkedSignal({ source: this.consultation, computation: () => false });

  protected readonly etat: Signal<EtatVueSynthese> = computed(() => {
    const consultation = this.consultation();
    return consultation === undefined ? { kind: 'ADRESSE_INVALIDE' } : this.etatDeLaLecture(consultation);
  });

  protected readonly identitesOperateurs = computed(() => (this.operateurs.hasValue() ? this.operateurs.value() : []));

  protected readonly identite = computed<IdentiteOperateur | undefined>(() => {
    const etat = this.etat();
    if (etat.kind === 'SUCCES') {
      return etat.releve.operateur;
    }
    return this.operateurs.hasValue()
      ? this.operateurs.value().find(operateur => operateur.id.value === this.operateur())?.identite
      : undefined;
  });

  protected readonly annees = computed(() => Array.from({ length: ANNEES_OFFERTES }, (_, rang) => this.semaineCourante.annee - rang));

  protected semainesOffertes(semaine: SemaineISO): readonly number[] {
    return Array.from({ length: derniereSemaineDe(semaine.annee, this.semaineCourante) }, (_, rang) => rang + 1);
  }

  protected readonly precedente = computed(() => this.semaine()?.precedente());
  protected readonly suivante = computed(() => semaineOfferte(this.semaine()?.suivante(), this.semaineCourante));

  protected parametresDe(semaine: SemaineISO): Record<string, number> {
    return { annee: semaine.annee, semaine: semaine.numero };
  }

  protected parametresDuJour(semaine: SemaineISO, jour: string): Record<string, number | string> {
    return { ...this.parametresDe(semaine), jour };
  }

  protected async choisirOperateur(operateur: OperateurReleveId): Promise<void> {
    const consultation = this.consultation();
    if (consultation === undefined) {
      return;
    }
    if (operateur.value === this.operateur()) {
      return;
    }
    const version = ++this.navigationVersion;
    this.echecNavigation.set(false);
    try {
      const navigue = await this.router.navigate(['/operateurs', operateur.value, 'heures'], {
        queryParams: this.parametresDuChangement(consultation),
      });
      this.receiveNavigationResult(version, consultation, !navigue);
    } catch (failure) {
      this.errors.handleError(failure);
      this.receiveNavigationResult(version, consultation, true);
    }
  }

  private parametresDuChangement(consultation: Consultation): Record<string, number | string> {
    const etat = this.etat();
    const jour =
      etat.kind === 'SUCCES'
        ? jourOuvert(consultation.jour, consultation.semaine, etat.releve, this.aujourdhui)?.value
        : this.jourExplicite(consultation);
    return { ...this.parametresDe(consultation.semaine), ...(jour === undefined ? {} : { jour }) };
  }

  private jourExplicite(consultation: Consultation): string | undefined {
    return consultation.jour.kind === 'NOMME' ? consultation.jour.jour.value : undefined;
  }

  private receiveNavigationResult(version: number, consultation: Consultation, echec: boolean): void {
    if (this.navigationIsCurrent(version, consultation)) {
      this.echecNavigation.set(echec);
    }
  }

  private navigationIsCurrent(version: number, consultation: Consultation): boolean {
    return version === this.navigationVersion && consultation === this.consultation();
  }

  protected choisirAnnee(valeur: string, courante: SemaineISO): void {
    const annee = Number(valeur);
    const numero = Math.min(courante.numero, derniereSemaineDe(annee, this.semaineCourante));
    void this.naviguerVers(new SemaineISO(annee, numero));
  }

  protected choisirSemaine(valeur: string, courante: SemaineISO): void {
    void this.naviguerVers(new SemaineISO(courante.annee, Number(valeur)));
  }

  protected choisir(rang: number): void {
    this.pointageChoisi.update(choisi => (choisi === rang ? undefined : rang));
  }

  protected reload(): void {
    this.releve.reload();
  }

  private naviguerVers(semaine: SemaineISO): Promise<boolean> {
    return this.router.navigate([], { relativeTo: this.route, queryParams: this.parametresDe(semaine) });
  }

  private etatDeLaLecture(consultation: Consultation): EtatVueSynthese {
    if (this.releve.isLoading()) {
      return { kind: 'CHARGEMENT' };
    }
    if (this.releve.status() === 'error') {
      return { kind: 'ERREUR' };
    }
    const releve = this.releve.value();
    if (releve === undefined) {
      return { kind: 'OPERATEUR_INTROUVABLE' };
    }
    const ouvert = jourOuvert(consultation.jour, consultation.semaine, releve, this.aujourdhui);
    const frise = friseDeLaSemaine(releve, this.aujourdhui, ouvert, this.pointageChoisi());
    return { kind: 'SUCCES', semaine: consultation.semaine, releve, frise };
  }
}
