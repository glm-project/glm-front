import { BornesDuJour } from '../journee/BornesDuJour';
import { Duree } from '../journee/Duree';
import { InstantDeLaJournee } from '../journee/InstantDeLaJournee';
import { JourACorriger } from '../journee/JourACorriger';
import { SuiviPresent } from '../journee/SuiviPresent';
import { CalendrierLocal } from './CalendrierLocal';
import { HeureSaisie } from './HeureSaisie';
import { IntervalleDAjout } from './IntervalleDAjout';
import { PortionsDeLAjout } from './PortionsDeLAjout';

export type ChampDePlage = 'DEBUT' | 'FIN';

export type ErreurDePlage =
  | { readonly kind: 'HEURE_MAL_ECRITE' }
  | { readonly kind: 'HEURES_MANQUANTES' }
  | { readonly kind: 'HORS_DU_JOUR'; readonly champ: ChampDePlage }
  | { readonly kind: 'FIN_HORS_DU_LENDEMAIN' }
  | { readonly kind: 'FIN_NON_APRES_DEBUT' }
  | { readonly kind: 'FIN_AVANT_DEBUT_LE_MEME_JOUR'; readonly debut: InstantDeLaJournee; readonly fin: InstantDeLaJournee }
  | { readonly kind: 'FIN_APRES_MAINTENANT' }
  | { readonly kind: 'DEBUT_AVANT_ENGAGEMENT'; readonly engagement: InstantDeLaJournee }
  | { readonly kind: 'FIN_APRES_CLOTURE'; readonly cloture: InstantDeLaJournee };

interface CadreDeLaPlage {
  readonly bornes: BornesDuJour;
  readonly jour: JourACorriger;
  readonly calendrier: CalendrierLocal;
  readonly maintenant: InstantDeLaJournee;
  readonly suivi: SuiviPresent | undefined;
}

interface SaisieDeLaPlage {
  readonly debut: string;
  readonly fin: string;
  readonly finLeLendemain: boolean;
  readonly tentee: boolean;
}

type HeureLue =
  { readonly kind: 'VIDE' } | { readonly kind: 'MAL_ECRITE' } | { readonly kind: 'LUE'; readonly instant: InstantDeLaJournee };

const VIDE: HeureLue = { kind: 'VIDE' };
const MAL_ECRITE: HeureLue = { kind: 'MAL_ECRITE' };

const lire = (texte: string, jour: JourACorriger, cadre: CadreDeLaPlage): HeureLue => {
  if (texte.trim() === '') {
    return VIDE;
  }
  const heure = HeureSaisie.lire(texte);
  return heure === undefined ? MAL_ECRITE : { kind: 'LUE', instant: heure.le(jour, cadre.calendrier) };
};

const instantLu = (heure: HeureLue): InstantDeLaJournee | undefined => (heure.kind === 'LUE' ? heure.instant : undefined);

export class PlageDAjout {
  private constructor(
    private readonly cadre: CadreDeLaPlage,
    private readonly saisie: SaisieDeLaPlage,
  ) {}

  static pour(bornes: BornesDuJour, jour: JourACorriger, maintenant: InstantDeLaJournee, calendrier: CalendrierLocal): PlageDAjout {
    return new PlageDAjout(
      { bornes, jour, calendrier, maintenant, suivi: undefined },
      { debut: '', fin: '', finLeLendemain: false, tentee: false },
    );
  }

  avecSuivi(suivi: SuiviPresent | undefined): PlageDAjout {
    return new PlageDAjout({ ...this.cadre, suivi }, this.saisie);
  }

  avecMaintenant(maintenant: InstantDeLaJournee): PlageDAjout {
    return new PlageDAjout({ ...this.cadre, maintenant }, this.saisie);
  }

  avecDebut(texte: string): PlageDAjout {
    return new PlageDAjout(this.cadre, { ...this.saisie, debut: texte });
  }

  avecFin(texte: string): PlageDAjout {
    return new PlageDAjout(this.cadre, { ...this.saisie, fin: texte });
  }

  avecFinLeLendemain(): PlageDAjout {
    return new PlageDAjout(this.cadre, { ...this.saisie, finLeLendemain: true });
  }

  avecFinLeJourAffiche(): PlageDAjout {
    return new PlageDAjout(this.cadre, { ...this.saisie, finLeLendemain: false });
  }

  apresUnEnvoi(): PlageDAjout {
    return new PlageDAjout(this.cadre, { ...this.saisie, tentee: true });
  }

  finLeLendemain(): boolean {
    return this.saisie.finLeLendemain;
  }

  lendemainDisponible(): boolean {
    return !this.cadre.maintenant.estAvant(this.cadre.bornes.fin);
  }

  finProposee(): InstantDeLaJournee | undefined {
    const lendemain = this.avecFinLeLendemain();
    return this.erreur()?.kind === 'FIN_AVANT_DEBUT_LE_MEME_JOUR' && lendemain.erreur() === undefined ? lendemain.fin() : undefined;
  }

  texteDuDebut(): string {
    return this.saisie.debut;
  }

  texteDeLaFin(): string {
    return this.saisie.fin;
  }

  erreur(): ErreurDePlage | undefined {
    return this.erreurDeFormat() ?? this.erreurDHeureManquante() ?? this.erreurDuDebut() ?? this.erreurDeLaFin();
  }

  intervalle(): IntervalleDAjout | undefined {
    const debut = this.debut();
    const fin = this.fin();
    return debut === undefined || fin === undefined ? undefined : IntervalleDAjout.entre(debut, fin);
  }

  aEnvoyer(): PortionsDeLAjout | undefined {
    return this.erreur() === undefined ? this.portions() : undefined;
  }

  duree(): Duree | undefined {
    return this.intervalle()?.duree();
  }

  portions(): PortionsDeLAjout | undefined {
    const intervalle = this.intervalle();
    return intervalle === undefined || this.estHorsDesJours(intervalle)
      ? undefined
      : new PortionsDeLAjout(intervalle, this.cadre.jour, this.cadre.bornes.fin);
  }

  private debutLu(): HeureLue {
    return lire(this.saisie.debut, this.cadre.jour, this.cadre);
  }

  private finLue(): HeureLue {
    return lire(this.saisie.fin, this.jourDeLaFin(), this.cadre);
  }

  private jourDeLaFin(): JourACorriger {
    return this.saisie.finLeLendemain ? this.cadre.jour.lendemain() : this.cadre.jour;
  }

  private debut(): InstantDeLaJournee | undefined {
    return instantLu(this.debutLu());
  }

  private fin(): InstantDeLaJournee | undefined {
    return instantLu(this.finLue());
  }

  private estHorsDuJour(instant: InstantDeLaJournee): boolean {
    return instant.estAvant(this.cadre.bornes.debut) || this.cadre.bornes.fin.estAvant(instant);
  }

  private erreurDeFormat(): ErreurDePlage | undefined {
    return this.debutLu().kind === 'MAL_ECRITE' || this.finLue().kind === 'MAL_ECRITE' ? { kind: 'HEURE_MAL_ECRITE' } : undefined;
  }

  private erreurDHeureManquante(): ErreurDePlage | undefined {
    const manque = this.debutLu().kind === 'VIDE' || this.finLue().kind === 'VIDE';
    return this.saisie.tentee && manque ? { kind: 'HEURES_MANQUANTES' } : undefined;
  }

  private erreurDuDebut(): ErreurDePlage | undefined {
    const debut = this.debut();
    if (debut === undefined) {
      return undefined;
    }
    if (this.estHorsDuJour(debut)) {
      return { kind: 'HORS_DU_JOUR', champ: 'DEBUT' };
    }
    const engagement = this.cadre.suivi?.engageLe;
    return engagement !== undefined && debut.estAvant(engagement) ? { kind: 'DEBUT_AVANT_ENGAGEMENT', engagement } : undefined;
  }

  private erreurDeLaFin(): ErreurDePlage | undefined {
    const fin = this.fin();
    return fin === undefined ? undefined : (this.erreurDeLaPlaceDeLaFin(fin) ?? this.erreurDeLOrdre(fin) ?? this.erreurDeLaCloture(fin));
  }

  private erreurDeLaPlaceDeLaFin(fin: InstantDeLaJournee): ErreurDePlage | undefined {
    if (!this.estFinHorsDesJours(fin)) {
      return undefined;
    }
    return this.saisie.finLeLendemain ? { kind: 'FIN_HORS_DU_LENDEMAIN' } : { kind: 'HORS_DU_JOUR', champ: 'FIN' };
  }

  private estHorsDesJours(intervalle: IntervalleDAjout): boolean {
    return this.estHorsDuJour(intervalle.debut) || this.estFinHorsDesJours(intervalle.fin);
  }

  private estFinHorsDesJours(fin: InstantDeLaJournee): boolean {
    return this.saisie.finLeLendemain ? this.estHorsDuLendemain(fin) : this.estHorsDuJour(fin);
  }

  private estHorsDuLendemain(fin: InstantDeLaJournee): boolean {
    return fin.estAvant(this.cadre.bornes.fin) || this.cadre.bornes.finDuLendemain.estAvant(fin);
  }

  private erreurDeLOrdre(fin: InstantDeLaJournee): ErreurDePlage | undefined {
    const debut = this.debut();
    if (this.neSuitPasLeDebut(debut, fin)) {
      return this.erreurDeFinNonApresDebut(debut, fin);
    }
    return this.cadre.maintenant.estAvant(fin) ? { kind: 'FIN_APRES_MAINTENANT' } : undefined;
  }

  private neSuitPasLeDebut(debut: InstantDeLaJournee | undefined, fin: InstantDeLaJournee): debut is InstantDeLaJournee {
    return debut !== undefined && !debut.estAvant(fin);
  }

  private erreurDeFinNonApresDebut(debut: InstantDeLaJournee, fin: InstantDeLaJournee): ErreurDePlage {
    return !this.saisie.finLeLendemain && fin.estAvant(debut)
      ? { kind: 'FIN_AVANT_DEBUT_LE_MEME_JOUR', debut, fin }
      : { kind: 'FIN_NON_APRES_DEBUT' };
  }

  private erreurDeLaCloture(fin: InstantDeLaJournee): ErreurDePlage | undefined {
    const cloture = this.cadre.suivi?.clotureLe;
    return cloture !== undefined && cloture.estAvant(fin) ? { kind: 'FIN_APRES_CLOTURE', cloture } : undefined;
  }
}
