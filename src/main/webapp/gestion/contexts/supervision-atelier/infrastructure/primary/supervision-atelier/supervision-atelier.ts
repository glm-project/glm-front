import { Icon } from '@/app/shared/design-system/infrastructure/primary/icon/icon';
import { Component, inject, linkedSignal, resource, ResourceStatus } from '@angular/core';
import { Instant } from '../../../domain/instant/Instant';
import { CouloirDeSupervision } from '../../../domain/supervision/CouloirDeSupervision';
import { DonneesDeSupervisionPort } from '../../../domain/supervision/DonneesDeSupervisionPort';
import { OperateurSupervise } from '../../../domain/supervision/OperateurSupervise';
import { SupervisionDeLAtelier } from '../../../domain/supervision/SupervisionDeLAtelier';
import { LIBELLES_SUPERVISION, MomentAffiche } from './LibellesSupervision';
import { SupervisionRefreshCycle } from './SupervisionRefreshCycle';

export type EtatVueSupervision =
  { readonly kind: 'CHARGEMENT' } | { readonly kind: 'ERREUR' } | { readonly kind: 'SUCCES'; readonly supervision: SupervisionDeLAtelier };

export interface SignalAffiche {
  readonly nombre: number;
  readonly texte: string;
}

const SLUGS: Record<CouloirDeSupervision, string> = {
  AU_TRAVAIL: 'au-travail',
  SANS_AFFECTATION: 'sans-affectation',
  ABSENT: 'absents',
};

const CHARGEMENT: EtatVueSupervision = { kind: 'CHARGEMENT' };

const pendantLaLecture = (precedent: EtatVueSupervision | undefined): EtatVueSupervision =>
  precedent?.kind === 'SUCCES' ? precedent : CHARGEMENT;

const nomComplet = (supervise: OperateurSupervise): string => `${supervise.operateur.nom} ${supervise.operateur.prenom}`;

const momentOf = (prefixe: string, instant: Instant | undefined, reference: Instant): MomentAffiche | undefined =>
  instant === undefined ? undefined : LIBELLES_SUPERVISION.moment(prefixe, instant, reference);

@Component({
  selector: 'glm-supervision-atelier',
  templateUrl: './supervision-atelier.html',
  styleUrl: './supervision-atelier.css',
  host: { 'data-selector': 'supervision-atelier' },
  imports: [Icon],
})
export class SupervisionAtelier {
  protected readonly libelles = LIBELLES_SUPERVISION;
  protected readonly slugs = SLUGS;
  private readonly donneesPort = inject(DonneesDeSupervisionPort);
  protected readonly donnees = resource({ loader: () => this.refreshCycle.run(() => this.donneesPort.read()) });
  private readonly refreshCycle: SupervisionRefreshCycle = new SupervisionRefreshCycle(() => this.donnees.reload());

  protected readonly etat = linkedSignal<ResourceStatus, EtatVueSupervision>({
    source: () => this.donnees.status(),
    computation: (_status, precedent) => (this.donnees.isLoading() ? pendantLaLecture(precedent?.value) : this.evaluate()),
  });

  private evaluate(): EtatVueSupervision {
    if (!this.donnees.hasValue()) {
      return { kind: 'ERREUR' };
    }
    const raw = this.donnees.value();
    const maintenant = new Instant(new Date().toISOString());
    const resultat = SupervisionDeLAtelier.determine(raw.operateurs, raw.journees, raw.activites, maintenant);
    if (!resultat.estExploitable) {
      return { kind: 'ERREUR' };
    }
    return { kind: 'SUCCES', supervision: resultat.supervision };
  }

  protected signalNc(supervision: SupervisionDeLAtelier): SignalAffiche {
    const enNc = supervision.operateursEnNonConformite();
    return { nombre: enNc.length, texte: this.libelles.signal(this.libelles.enNc, enNc.map(nomComplet)) };
  }

  protected signalAVerifier(supervision: SupervisionDeLAtelier): SignalAffiche {
    const aVerifier = supervision.operateursAVerifier();
    return { nombre: aVerifier.length, texte: this.libelles.signal(this.libelles.aVerifier, aVerifier.map(nomComplet)) };
  }

  protected momentDeLaCarte(supervise: OperateurSupervise, reference: Instant): MomentAffiche | undefined {
    switch (supervise.couloir()) {
      case 'AU_TRAVAIL':
      case 'SANS_AFFECTATION':
        return momentOf(this.libelles.arrivee, supervise.heureDOuverture, reference);
      case 'ABSENT':
        return undefined;
    }
  }
}
