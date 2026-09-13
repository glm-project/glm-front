import { Component, computed, inject, resource } from '@angular/core';
import { DonneesDeSupervisionPort } from '../../domain/DonneesDeSupervisionPort';
import { Instant } from '../../domain/Instant';
import { OperateurSupervise } from '../../domain/OperateurSupervise';
import { SupervisionDeLAtelier } from '../../domain/SupervisionDeLAtelier';

export type EtatVueSupervision =
  | { readonly kind: 'CHARGEMENT' }
  | { readonly kind: 'ERREUR' }
  | { readonly kind: 'SUCCES'; readonly operateurs: readonly OperateurSupervise[] };

@Component({
  selector: 'glm-supervision-atelier',
  templateUrl: './supervision-atelier.html',
  host: { 'data-selector': 'supervision-atelier' },
})
export class SupervisionAtelier {
  private readonly donneesPort = inject(DonneesDeSupervisionPort);
  protected readonly donnees = resource({ loader: () => this.donneesPort.read() });

  protected readonly etat = computed<EtatVueSupervision>(() => {
    if (this.donnees.isLoading()) {
      return { kind: 'CHARGEMENT' };
    }
    if (!this.donnees.hasValue()) {
      return { kind: 'ERREUR' };
    }
    const raw = this.donnees.value();
    const maintenant = new Instant(new Date().toISOString());
    const resultat = SupervisionDeLAtelier.determine(raw.operateurs, raw.journees, raw.activites, maintenant);
    if (!resultat.estExploitable) {
      return { kind: 'ERREUR' };
    }
    return { kind: 'SUCCES', operateurs: resultat.supervision.operateurs };
  });
}
