import { Component, computed, inject, resource, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { JourDeReleve } from '../../../domain/releve/JourDeReleve';
import { OperateurReleveId } from '../../../domain/releve/OperateurReleveId';
import { PointageDeReleve } from '../../../domain/releve/PointageDeReleve';
import { ReleveDesHeures } from '../../../domain/releve/ReleveDesHeures';
import { DemandeDeReleve, SyntheseDesHeuresPort } from '../../../domain/releve/SyntheseDesHeuresPort';
import { semaineDemandee } from '../../../domain/semaine/SemaineDemandee';
import { SemaineISO } from '../../../domain/semaine/SemaineISO';
import { jourCourant } from '../jourCourant';
import { LIBELLES_RELEVE_DES_HEURES } from '../LibellesReleveDesHeures';

const ANNEES_OFFERTES = 6;

export type EtatVueSynthese =
  | { readonly kind: 'ADRESSE_INVALIDE' }
  | { readonly kind: 'CHARGEMENT' }
  | { readonly kind: 'ERREUR' }
  | { readonly kind: 'OPERATEUR_INTROUVABLE' }
  | { readonly kind: 'SUCCES'; readonly releve: ReleveDesHeures };

/** Les semaines à venir ne portent aucun pointage : le back refuse une saisie postérieure à l'instant courant. */
const semaineOfferte = (semaine: SemaineISO | undefined, courante: SemaineISO): SemaineISO | undefined =>
  semaine !== undefined && !semaine.estApres(courante) ? semaine : undefined;

const derniereSemaineDe = (annee: number, courante: SemaineISO): number =>
  annee === courante.annee ? courante.numero : SemaineISO.nombreDeSemaines(annee);

@Component({
  selector: 'glm-synthese-des-heures',
  host: { 'data-selector': 'synthese-page' },
  templateUrl: './SyntheseDesHeures.html',
  styleUrl: './SyntheseDesHeures.css',
  imports: [MatButtonModule, MatTableModule, RouterLink],
})
export class SyntheseDesHeures {
  protected readonly libelles = LIBELLES_RELEVE_DES_HEURES;
  protected readonly colonnes = ['jour', 'duree', 'pointages'];

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly port = inject(SyntheseDesHeuresPort);

  /** La semaine en cours est figée à l'ouverture : un relevé qu'on lit ne doit pas changer de semaine tout seul. */
  private readonly semaineCourante = SemaineISO.contenant(jourCourant());

  private readonly parametres = toSignal(this.route.queryParamMap, { requireSync: true });
  private readonly chemin = toSignal(this.route.paramMap, { requireSync: true });

  private readonly operateur = computed(() => this.chemin().get('operateur'));

  private readonly demandee = computed(() =>
    semaineDemandee(
      { annee: this.parametres().get('annee') ?? undefined, semaine: this.parametres().get('semaine') ?? undefined },
      jourCourant(),
    ),
  );

  protected readonly semaine = computed<SemaineISO | undefined>(() => {
    const demandee = this.demandee();
    return demandee.estConnue ? demandee.semaine : undefined;
  });

  /** Une adresse refusée laisse la ressource au repos : Angular n'appelle pas le loader quand `params` est `undefined`. */
  private readonly demande = computed<DemandeDeReleve | undefined>(() => {
    const semaine = this.semaine();
    const operateur = this.operateur();
    if (semaine === undefined) {
      return undefined;
    }
    if (operateur === null) {
      return undefined;
    }
    return new DemandeDeReleve(new OperateurReleveId(operateur), semaine);
  });

  private readonly releve = resource({
    params: () => this.demande(),
    loader: ({ params }) => this.port.synthese(params),
  });

  protected readonly etat: Signal<EtatVueSynthese> = computed(() => {
    if (this.demande() === undefined) {
      return { kind: 'ADRESSE_INVALIDE' };
    }
    return this.etatDeLaLecture();
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

  /** Passer à une année plus courte ramène à sa dernière semaine plutôt que de refuser le geste. */
  protected choisirAnnee(valeur: string, courante: SemaineISO): void {
    const annee = Number(valeur);
    const numero = Math.min(courante.numero, derniereSemaineDe(annee, this.semaineCourante));
    void this.naviguerVers(new SemaineISO(annee, numero));
  }

  protected choisirSemaine(valeur: string, courante: SemaineISO): void {
    void this.naviguerVers(new SemaineISO(courante.annee, Number(valeur)));
  }

  protected reload(): void {
    this.releve.reload();
  }

  protected libelleDuPointage(pointage: PointageDeReleve): string {
    return this.libelles.pointage(pointage.type, pointage.instant);
  }

  protected dureeDuJour(jour: JourDeReleve): string {
    return jour.estSansPointage() ? this.libelles.sansValeur : this.libelles.duree(jour.duree);
  }

  private naviguerVers(semaine: SemaineISO): Promise<boolean> {
    return this.router.navigate([], { relativeTo: this.route, queryParams: this.parametresDe(semaine) });
  }

  private etatDeLaLecture(): EtatVueSynthese {
    if (this.releve.isLoading()) {
      return { kind: 'CHARGEMENT' };
    }
    if (this.releve.status() === 'error') {
      return { kind: 'ERREUR' };
    }
    const releve = this.releve.value();
    return releve === undefined ? { kind: 'OPERATEUR_INTROUVABLE' } : { kind: 'SUCCES', releve };
  }
}
