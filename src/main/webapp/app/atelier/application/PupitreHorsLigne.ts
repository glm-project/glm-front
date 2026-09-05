import { projectPupitre } from '@/app/atelier/domain/ProjectionDuPupitre';
import {
  EvenementLocal,
  GesteLocal,
  OperateurDuPupitre,
  PointageLocal,
  PUPITRE_VIDE,
  PupitreLocal,
} from '@/app/atelier/domain/PupitreLocal';
import { RefusDuPupitre } from '@/app/atelier/domain/RefusDuPupitre';
import { ServeurDuPupitrePort } from '@/app/atelier/domain/ServeurDuPupitrePort';
import { TypeDePointage } from '@/app/atelier/domain/TypeDePointage';
import { TypeDePresence } from '@/app/atelier/domain/TypeDePresence';
import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { StockageLocalPort } from '@/app/shared/stockage-local/domain/StockageLocalPort';
import { inject, Injectable, signal } from '@angular/core';

const CONCURRENCE = 'urn:glm:erreur:atelier:saisie-concurrente';
const ARRIVEE_EXISTANTE = 'urn:glm:erreur:atelier:journee-de-travail-deja-ouverte';
const PRESENCE_EXISTANTE = 'urn:glm:erreur:atelier:transition-de-presence-interdite';

interface FenetreOperateur {
  entreprise: string;
  operateur: OperateurDuPupitre;
  vue: PupitreLocal;
  arriveeAssuree: boolean;
}

export interface PointageDuPupitre {
  suiviId: string;
  type: TypeDePointage;
  posteId?: string;
}

const keyFor = (entreprise: string): string => `atelier:${entreprise}`;
const pending = (geste: GesteLocal): EvenementLocal => ({ geste, etat: 'EN_ATTENTE' });
const identity = (): { id: string; dateDeSurvenue: string } => ({ id: crypto.randomUUID(), dateDeSurvenue: new Date().toISOString() });

const absorbs = (geste: GesteLocal, refus: RefusDuPupitre): boolean => {
  if (geste.nature === 'ARRIVEE') {
    return refus.code === ARRIVEE_EXISTANTE;
  }
  return geste.nature === 'PRESENCE' && geste.implicite && refus.code === PRESENCE_EXISTANTE;
};

@Injectable()
export class PupitreHorsLigne {
  private readonly authentication = inject(AuthenticationPort);
  private readonly stockage = inject(StockageLocalPort);
  private readonly serveur = inject(ServeurDuPupitrePort);
  private readonly vue = signal<PupitreLocal>(PUPITRE_VIDE);
  private readonly connexion = signal(true);
  private fenetre: FenetreOperateur | undefined;
  private synchronisation: Promise<void> | undefined;
  private synchronisationDemandee = false;
  private saisie: Promise<void> = Promise.resolve();

  readonly connected = this.connexion.asReadonly();

  referentiel(): ReturnType<typeof projectPupitre> {
    return projectPupitre(this.vue());
  }

  async openWindow(code: string): Promise<OperateurDuPupitre> {
    await this.authentication.synchronizeSession();
    if (this.fenetre !== undefined) {
      throw new Error('Une fenetre operateur est deja ouverte.');
    }
    const entreprise = this.requireTenant();
    const vue = (await this.stockage.read<PupitreLocal>(keyFor(entreprise))) ?? PUPITRE_VIDE;
    if (this.authentication.currentTenant() !== entreprise) {
      throw new Error('L’entreprise du pupitre a change.');
    }
    const operateur = vue.referentiel?.operateurs.find(candidat => candidat.matricule === code);
    if (operateur === undefined) {
      throw new Error('Matricule absent du referentiel local.');
    }
    this.fenetre = { entreprise, operateur, vue, arriveeAssuree: false };
    this.vue.set(vue);
    return operateur;
  }

  async closeWindow(): Promise<void> {
    await this.saisie;
    this.fenetre = undefined;
    await this.restore();
  }

  recordPointage(pointage: PointageDuPupitre): Promise<void> {
    const fenetre = this.requireWindow();
    if (pointage.posteId !== undefined && fenetre.operateur.postes.every(poste => poste.id !== pointage.posteId)) {
      return Promise.reject(new Error('Poste absent des habilitations locales.'));
    }
    const geste: PointageLocal = { ...identity(), ...pointage, operateurId: fenetre.operateur.id, nature: 'POINTAGE' };
    const ouverture = this.createOuverture(geste);
    return this.enqueue(fenetre, () => this.prependOuverture(fenetre, geste, ouverture), true);
  }

  private createOuverture(geste: PointageLocal): GesteLocal[] {
    const arrivee: GesteLocal = { ...identity(), dateDeSurvenue: geste.dateDeSurvenue, operateurId: geste.operateurId, nature: 'ARRIVEE' };
    const reprise: GesteLocal = {
      ...identity(),
      dateDeSurvenue: geste.dateDeSurvenue,
      operateurId: geste.operateurId,
      nature: 'PRESENCE',
      type: 'REPRISE',
      implicite: true,
    };
    return [arrivee, reprise];
  }

  private prependOuverture(fenetre: FenetreOperateur, geste: PointageLocal, ouverture: GesteLocal[]): GesteLocal[] {
    if (fenetre.arriveeAssuree) {
      return [geste];
    }
    return [...ouverture, geste];
  }

  recordPresence(type: TypeDePresence): Promise<void> {
    const fenetre = this.requireWindow();
    const geste: GesteLocal = { ...identity(), operateurId: fenetre.operateur.id, nature: 'PRESENCE', type, implicite: false };
    return this.enqueue(fenetre, () => [geste], false);
  }

  async diagnostics(): Promise<EvenementLocal[]> {
    const state = await this.stockage.read<PupitreLocal>(keyFor(this.requireTenant()));
    return (state?.evenements ?? []).filter(evenement => evenement.etat === 'REFUSE');
  }

  async restore(): Promise<void> {
    const entreprise = this.authentication.currentTenant();
    if (entreprise === undefined) {
      this.vue.set(PUPITRE_VIDE);
      return;
    }
    const state = (await this.stockage.read<PupitreLocal>(keyFor(entreprise))) ?? PUPITRE_VIDE;
    this.publish(entreprise, state);
  }

  synchronize(): Promise<void> {
    this.synchronisationDemandee = true;
    if (this.synchronisation !== undefined) {
      return this.synchronisation;
    }
    this.synchronisation = this.stockage
      .lock('synchronisation', async () => {
        while (this.synchronisationDemandee) {
          this.synchronisationDemandee = false;
          await this.exchange();
        }
      })
      .finally(() => {
        this.synchronisation = undefined;
      });
    return this.synchronisation;
  }

  private async exchange(): Promise<void> {
    await this.authentication.synchronizeSession();
    await this.restore();
    const entreprise = this.authentication.currentTenant();
    if (entreprise === undefined || this.authentication.currentToken() === undefined) {
      return;
    }
    await this.drain(entreprise);
    const token = this.authentication.currentToken();
    if (this.authentication.currentTenant() !== entreprise || token === undefined) {
      return;
    }
    await this.refreshReferentiel(entreprise, token);
  }

  private async refreshReferentiel(entreprise: string, token: string): Promise<void> {
    try {
      const referentiel = await this.serveur.referentiel();
      await this.authentication.synchronizeSession();
      if (this.authentication.currentTenant() === entreprise && this.authentication.currentToken() === token) {
        const state = await this.stockage.update<PupitreLocal>(keyFor(entreprise), PUPITRE_VIDE, current => ({ ...current, referentiel }));
        this.publish(entreprise, state);
      }
    } catch (failure: unknown) {
      console.error('Referentiel non actualise', failure);
    }
  }

  private async drain(entreprise: string): Promise<void> {
    while (this.authentication.currentTenant() === entreprise && this.authentication.currentToken() !== undefined) {
      const state = (await this.stockage.read<PupitreLocal>(keyFor(entreprise))) ?? PUPITRE_VIDE;
      const evenement = state.evenements.find(candidate => candidate.etat === 'EN_ATTENTE');
      if (evenement === undefined) {
        return;
      }
      const result = await this.replay(entreprise, evenement);
      if (result === undefined) {
        return;
      }
      await this.saveReplay(entreprise, result);
    }
  }

  private async replay(entreprise: string, evenement: EvenementLocal): Promise<EvenementLocal | undefined> {
    try {
      await this.stockage.lock('session', async () => {
        await this.authentication.synchronizeSession();
        await this.push(entreprise, evenement.geste);
      });
      return { ...evenement, etat: 'ACCEPTE' };
    } catch (failure: unknown) {
      if (failure instanceof RefusDuPupitre) {
        return { ...evenement, etat: 'REFUSE', refus: { code: failure.code, message: failure.message } };
      }
      await this.markDisconnected(entreprise);
      return undefined;
    }
  }

  private async markDisconnected(entreprise: string): Promise<void> {
    const failed = await this.stockage.update<PupitreLocal>(keyFor(entreprise), PUPITRE_VIDE, current => ({
      ...current,
      connecte: false,
    }));
    this.publish(entreprise, failed);
  }

  private async saveReplay(entreprise: string, result: EvenementLocal): Promise<void> {
    const updated = await this.stockage.update<PupitreLocal>(keyFor(entreprise), PUPITRE_VIDE, current => ({
      ...current,
      connecte: true,
      evenements: current.evenements.map(candidate => this.replaceEvenement(candidate, result)),
    }));
    this.publish(entreprise, updated);
  }

  private replaceEvenement(candidate: EvenementLocal, result: EvenementLocal): EvenementLocal {
    if (candidate.geste.id === result.geste.id) {
      return result;
    }
    return candidate;
  }

  private async push(entreprise: string, geste: GesteLocal): Promise<void> {
    try {
      this.requireExchange(entreprise);
      await this.serveur.send(geste);
    } catch (failure: unknown) {
      if (failure instanceof RefusDuPupitre && failure.code === CONCURRENCE) {
        await this.retryAfterConcurrence(entreprise, geste);
        return;
      }
      this.absorbOrThrow(geste, failure);
    }
  }

  private async retryAfterConcurrence(entreprise: string, geste: GesteLocal): Promise<void> {
    this.requireExchange(entreprise);
    await this.serveur.reread(geste);
    this.requireExchange(entreprise);
    await this.serveur.send(geste).catch((refusal: unknown) => this.absorbOrThrow(geste, refusal));
  }

  private absorbOrThrow(geste: GesteLocal, failure: unknown): void {
    if (failure instanceof RefusDuPupitre && absorbs(geste, failure)) {
      return;
    }
    throw failure;
  }

  private enqueue(fenetre: FenetreOperateur, gestures: () => GesteLocal[], assureArrivee: boolean): Promise<void> {
    const accepted = this.saisie.then(() => this.persistGestes(fenetre, gestures, assureArrivee));
    this.saisie = accepted.catch(() => undefined);
    return accepted;
  }

  private async persistGestes(fenetre: FenetreOperateur, gestures: () => GesteLocal[], assureArrivee: boolean): Promise<void> {
    await this.authentication.synchronizeSession();
    if (this.fenetre !== fenetre || this.authentication.currentTenant() !== fenetre.entreprise) {
      throw new Error('La fenetre operateur a change.');
    }
    const evenements = gestures().map(pending);
    await this.stockage.update<PupitreLocal>(keyFor(fenetre.entreprise), PUPITRE_VIDE, current => ({
      ...current,
      evenements: [...current.evenements, ...evenements],
    }));
    fenetre.arriveeAssuree ||= assureArrivee;
    fenetre.vue = { ...fenetre.vue, evenements: [...fenetre.vue.evenements, ...evenements] };
    this.vue.set(fenetre.vue);
    void this.synchronize().catch((failure: unknown) => console.error('Synchronisation interrompue', failure));
  }

  private publish(entreprise: string, state: PupitreLocal): void {
    if (this.authentication.currentTenant() !== entreprise) {
      return;
    }
    this.connexion.set(state.connecte);
    if (this.fenetre !== undefined && this.fenetre.entreprise !== entreprise) {
      this.fenetre = undefined;
    }
    if (this.fenetre === undefined) {
      this.vue.set(state);
    }
  }

  private requireTenant(): string {
    const entreprise = this.authentication.currentTenant();
    if (entreprise === undefined) {
      throw new Error('Le pupitre doit etre enrole une premiere fois.');
    }
    return entreprise;
  }

  private requireWindow(): FenetreOperateur {
    if (this.fenetre === undefined) {
      throw new Error('Aucune fenetre operateur ouverte.');
    }
    return this.fenetre;
  }

  private requireExchange(entreprise: string): void {
    if (this.authentication.currentTenant() !== entreprise || this.authentication.currentToken() === undefined) {
      throw new Error('L’autorisation du pupitre a change.');
    }
  }
}
