import { inject, Injectable, signal } from '@angular/core';
import { ActiviteAnomalieId } from '../domain/dossier/ActiviteAnomalieId';
import { AdresseDossier } from '../domain/dossier/DossierAnomalie';
import { InstantPointage } from '../domain/regularisation/InstantPointage';
import { CodeRefusRegularisation, RegularisationPort } from '../domain/regularisation/RegularisationPort';

export type EtatDeRegularisation =
  | { readonly kind: 'REPOS' | 'EN_COURS' | 'A_RELIRE' | 'ECHEC' }
  | { readonly kind: 'REGULARISEE'; readonly dateDeSurvenue: string }
  | { readonly kind: 'REFUSEE'; readonly code: CodeRefusRegularisation };

@Injectable()
export class RegularisationDeLaFin {
  private readonly port = inject(RegularisationPort);
  private readonly identifiantDeLaSaisie = crypto.randomUUID();
  private readonly etatCourant = signal<EtatDeRegularisation>({ kind: 'REPOS' });
  readonly etat = this.etatCourant.asReadonly();

  async valider(adresse: AdresseDossier, activite: ActiviteAnomalieId, dateDeSurvenue: string): Promise<void> {
    if (!this.peutEnvoyer(dateDeSurvenue)) return;
    this.etatCourant.set({ kind: 'EN_COURS' });
    this.etatCourant.set(await this.envoyer(adresse, activite, dateDeSurvenue));
  }

  private peutEnvoyer(dateDeSurvenue: string): boolean {
    return this.attendUneValidation() && new InstantPointage(dateDeSurvenue).isValid();
  }

  private attendUneValidation(): boolean {
    return ['REPOS', 'REFUSEE', 'A_RELIRE', 'ECHEC'].includes(this.etatCourant().kind);
  }

  private async envoyer(adresse: AdresseDossier, activite: ActiviteAnomalieId, dateDeSurvenue: string): Promise<EtatDeRegularisation> {
    try {
      const resultat = await this.port.regulariser({ suivi: adresse.suivi, id: this.identifiantDeLaSaisie, activite, dateDeSurvenue });
      if (resultat.kind === 'REGULARISEE') return { kind: 'REGULARISEE', dateDeSurvenue };
      return resultat.kind === 'REFUS' ? { kind: 'REFUSEE', code: resultat.code } : { kind: 'A_RELIRE' };
    } catch {
      return { kind: 'ECHEC' };
    }
  }
}
