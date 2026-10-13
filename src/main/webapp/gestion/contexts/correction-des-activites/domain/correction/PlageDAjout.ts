import { BornesDuJour } from '../journee/BornesDuJour';
import { Duree } from '../journee/Duree';
import { InstantDeLaJournee } from '../journee/InstantDeLaJournee';
import { JourACorriger } from '../journee/JourACorriger';
import { SuiviPresent } from '../journee/SuiviPresent';
import { CalendrierLocal } from './CalendrierLocal';
import { HeureSaisie } from './HeureSaisie';
import { IntervalleDAjout } from './IntervalleDAjout';

export type ChampDePlage = 'DEBUT' | 'FIN';

export type ErreurDePlage =
  | { readonly kind: 'HEURE_MAL_ECRITE' }
  | { readonly kind: 'HEURES_MANQUANTES' }
  | { readonly kind: 'HORS_DU_JOUR'; readonly champ: ChampDePlage }
  | { readonly kind: 'FIN_NON_APRES_DEBUT' }
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

interface HeuresTapees {
  readonly debut: string;
  readonly fin: string;
  readonly tentee: boolean;
}

type HeureLue =
  { readonly kind: 'VIDE' } | { readonly kind: 'MAL_ECRITE' } | { readonly kind: 'LUE'; readonly instant: InstantDeLaJournee };

const VIDE: HeureLue = { kind: 'VIDE' };
const MAL_ECRITE: HeureLue = { kind: 'MAL_ECRITE' };

const lire = (texte: string, cadre: CadreDeLaPlage): HeureLue => {
  if (texte.trim() === '') {
    return VIDE;
  }
  const heure = HeureSaisie.lire(texte);
  return heure === undefined ? MAL_ECRITE : { kind: 'LUE', instant: heure.le(cadre.jour, cadre.calendrier) };
};

const instantLu = (heure: HeureLue): InstantDeLaJournee | undefined => (heure.kind === 'LUE' ? heure.instant : undefined);

export class PlageDAjout {
  private constructor(
    private readonly cadre: CadreDeLaPlage,
    private readonly heures: HeuresTapees,
  ) {}

  static pour(bornes: BornesDuJour, jour: JourACorriger, maintenant: InstantDeLaJournee, calendrier: CalendrierLocal): PlageDAjout {
    return new PlageDAjout({ bornes, jour, calendrier, maintenant, suivi: undefined }, { debut: '', fin: '', tentee: false });
  }

  avecSuivi(suivi: SuiviPresent | undefined): PlageDAjout {
    return new PlageDAjout({ ...this.cadre, suivi }, this.heures);
  }

  avecMaintenant(maintenant: InstantDeLaJournee): PlageDAjout {
    return new PlageDAjout({ ...this.cadre, maintenant }, this.heures);
  }

  avecDebut(texte: string): PlageDAjout {
    return new PlageDAjout(this.cadre, { ...this.heures, debut: texte });
  }

  avecFin(texte: string): PlageDAjout {
    return new PlageDAjout(this.cadre, { ...this.heures, fin: texte });
  }

  apresUnEnvoi(): PlageDAjout {
    return new PlageDAjout(this.cadre, { ...this.heures, tentee: true });
  }

  texteDuDebut(): string {
    return this.heures.debut;
  }

  texteDeLaFin(): string {
    return this.heures.fin;
  }

  erreur(): ErreurDePlage | undefined {
    return this.erreurDeFormat() ?? this.erreurDHeureManquante() ?? this.erreurDuDebut() ?? this.erreurDeLaFin();
  }

  intervalle(): IntervalleDAjout | undefined {
    const debut = this.debut();
    const fin = this.fin();
    return debut === undefined || fin === undefined ? undefined : IntervalleDAjout.entre(debut, fin);
  }

  aEnvoyer(): IntervalleDAjout | undefined {
    return this.erreur() === undefined ? this.intervalle() : undefined;
  }

  duree(): Duree | undefined {
    return this.intervalle()?.duree();
  }

  private debutLu(): HeureLue {
    return lire(this.heures.debut, this.cadre);
  }

  private finLue(): HeureLue {
    return lire(this.heures.fin, this.cadre);
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
    return this.heures.tentee && manque ? { kind: 'HEURES_MANQUANTES' } : undefined;
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
    if (fin === undefined) {
      return undefined;
    }
    if (this.estHorsDuJour(fin)) {
      return { kind: 'HORS_DU_JOUR', champ: 'FIN' };
    }
    return this.erreurDeLOrdre(fin) ?? this.erreurDeLaCloture(fin);
  }

  private erreurDeLOrdre(fin: InstantDeLaJournee): ErreurDePlage | undefined {
    if (this.neSuitPasLeDebut(fin)) {
      return { kind: 'FIN_NON_APRES_DEBUT' };
    }
    return this.cadre.maintenant.estAvant(fin) ? { kind: 'FIN_APRES_MAINTENANT' } : undefined;
  }

  private neSuitPasLeDebut(fin: InstantDeLaJournee): boolean {
    const debut = this.debut();
    return debut !== undefined && !debut.estAvant(fin);
  }

  private erreurDeLaCloture(fin: InstantDeLaJournee): ErreurDePlage | undefined {
    const cloture = this.cadre.suivi?.clotureLe;
    return cloture !== undefined && cloture.estAvant(fin) ? { kind: 'FIN_APRES_CLOTURE', cloture } : undefined;
  }
}
