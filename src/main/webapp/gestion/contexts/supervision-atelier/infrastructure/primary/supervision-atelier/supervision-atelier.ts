import { Component, computed, inject, resource, signal } from '@angular/core';
import { ActiviteDeSupervision } from '../../../domain/activite/ActiviteDeSupervision';
import { Instant } from '../../../domain/instant/Instant';
import { DonneesDeSupervisionPort } from '../../../domain/supervision/DonneesDeSupervisionPort';
import { OperateurSupervise } from '../../../domain/supervision/OperateurSupervise';
import { SupervisionDeLAtelier } from '../../../domain/supervision/SupervisionDeLAtelier';
import { FriseSupervision } from './FriseSupervision';

import { LIBELLES_SUPERVISION } from './LibellesSupervision';
import { SupervisionRefreshCycle } from './SupervisionRefreshCycle';

export type { StatistiquesSupervision } from '../../../domain/supervision/StatistiquesSupervision';

export type EtatVueSupervision =
  | { readonly kind: 'CHARGEMENT' }
  | { readonly kind: 'ERREUR' }
  | {
      readonly kind: 'SUCCES';
      readonly operateurs: readonly OperateurSupervise[];
      readonly supervision: SupervisionDeLAtelier;
      readonly frise: FriseSupervision;
    };

export type FiltreSupervision = 'TOUS' | 'PRESENT' | 'EN_PAUSE' | 'ABSENT' | 'GLM' | 'ANOMALIE';

function correspondAuFiltre(supervise: OperateurSupervise, filtre: Exclude<FiltreSupervision, 'TOUS'> | null): boolean {
  if (filtre === null) {
    return true;
  }
  switch (filtre) {
    case 'PRESENT':
      return supervise.presence === 'PRESENT';
    case 'EN_PAUSE':
      return supervise.presence === 'EN_PAUSE';
    case 'ABSENT':
      return supervise.presence === 'ABSENT';
    case 'GLM':
      return supervise.isEnGlm();
    case 'ANOMALIE':
      return supervise.anomalies.length > 0;
  }
}

function activiteCorrespond(activite: ActiviteDeSupervision, recherche: string): boolean {
  if (activite.nom.toLowerCase().includes(recherche)) {
    return true;
  }
  const poste = activite.poste;
  if (poste === undefined) {
    return false;
  }
  return poste.toLowerCase().includes(recherche);
}

function correspondALaRecherche(supervise: OperateurSupervise, recherche: string): boolean {
  if (recherche === '') {
    return true;
  }
  const nomComplet = `${supervise.operateur.nom} ${supervise.operateur.prenom}`.toLowerCase();
  if (nomComplet.includes(recherche)) {
    return true;
  }
  const prenomNom = `${supervise.operateur.prenom} ${supervise.operateur.nom}`.toLowerCase();
  if (prenomNom.includes(recherche)) {
    return true;
  }
  return supervise.activites.some(act => activiteCorrespond(act, recherche));
}

@Component({
  selector: 'glm-supervision-atelier',
  templateUrl: './supervision-atelier.html',
  styleUrl: './supervision-atelier.css',
  host: { 'data-selector': 'supervision-atelier' },
})
export class SupervisionAtelier {
  protected readonly libelles = LIBELLES_SUPERVISION;
  private readonly donneesPort = inject(DonneesDeSupervisionPort);
  protected readonly donnees = resource({ loader: () => this.refreshCycle.run(() => this.donneesPort.read()) });
  private readonly refreshCycle: SupervisionRefreshCycle = new SupervisionRefreshCycle(() => this.donnees.reload());

  protected readonly ligneDepliee = signal<string | null>(null);

  protected openJournal(id: string): void {
    this.ligneDepliee.set(id);
  }

  protected toggleJournal(id: string): void {
    this.ligneDepliee.update(current => (current === id ? null : id));
  }

  protected readonly recherche = signal('');
  protected readonly filtreActif = signal<Exclude<FiltreSupervision, 'TOUS'> | null>(null);

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
    return {
      kind: 'SUCCES',
      operateurs: resultat.supervision.operateurs,
      supervision: resultat.supervision,
      frise: new FriseSupervision(maintenant),
    };
  });

  protected readonly derniereLecture = computed<string | null>(() => {
    const vue = this.etat();
    if (vue.kind !== 'SUCCES') {
      return null;
    }
    return this.libelles.heure(vue.frise.maintenant);
  });

  protected readonly aFiltreOuRechercheActif = computed(() => this.filtreActif() !== null || this.recherche().trim() !== '');

  protected readonly presentation = computed(() => {
    const vue = this.etat();
    if (vue.kind !== 'SUCCES') {
      return vue;
    }
    const filtre = this.filtreActif();
    const recherche = this.recherche().trim().toLowerCase();
    const operateursFiltres = vue.operateurs.filter(op => correspondAuFiltre(op, filtre) && correspondALaRecherche(op, recherche));
    const lignes = operateursFiltres.map(supervise => ({
      supervise,
      resume: [
        `${supervise.operateur.nom} ${supervise.operateur.prenom} · ${this.libelles.presences[supervise.presence]}`,
        ...(supervise.isEnGlm() ? [this.libelles.glmDetails] : []),
        ...supervise.anomalies.map(anomalie => this.libelles.anomalies[anomalie]),
        ...supervise.activites.map(activite =>
          [activite.nom, activite.poste, `Depuis ${this.libelles.heure(activite.debut)}`].filter(Boolean).join(' · '),
        ),
      ].join(' · '),
      activites: vue.frise.activites(supervise.activites),
      presence: vue.frise.presence(supervise.segments),
    }));
    return { ...vue, statistiques: vue.supervision.statistiques, lignes };
  });

  protected basculerFiltre(filtre: FiltreSupervision): void {
    if (filtre === 'TOUS') {
      this.filtreActif.set(null);
      return;
    }
    if (this.filtreActif() === filtre) {
      this.filtreActif.set(null);
    } else {
      this.filtreActif.set(filtre);
    }
  }

  protected modifierRecherche(valeur: string): void {
    this.recherche.set(valeur);
  }

  protected reinitialiserFiltres(): void {
    this.filtreActif.set(null);
    this.recherche.set('');
  }

  protected estAbsentCalme(supervise: OperateurSupervise): boolean {
    return supervise.isSansJourneeOuverte();
  }
}
