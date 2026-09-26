import { JourDeReleve } from '../../../domain/releve/JourDeReleve';
import { JourCalendaire } from '../../../domain/semaine/JourCalendaire';
import { LIBELLES_RELEVE_DES_HEURES } from '../LibellesReleveDesHeures';
import {
  AgendaDeLaSemaine,
  ClasseDeHauteur,
  Dessin,
  DessinDePause,
  DessinDePauseSansReprise,
  DessinDePlage,
  DessinDePlageEnCours,
  NoteDePlagesCourtes,
} from './AgendaDeLaSemaine';

const LIBELLES = LIBELLES_RELEVE_DES_HEURES;

export interface BlocAffiche {
  readonly haut: number;
  readonly hauteur: number;
  readonly classe: ClasseDeHauteur;
  readonly presumee: boolean;
  readonly depuisLaVeille: boolean;
  readonly seLePoursuit: boolean;
  readonly debut: string;
  readonly fin: string;
  readonly bornes: string;
  readonly titre: string;
}

export interface NoteAffichee {
  readonly haut: number;
  readonly lignes: readonly string[];
}

export interface PauseAffichee {
  readonly haut: number;
  readonly hauteur: number;
  readonly depuisLaVeille: boolean;
  readonly etiquetee: boolean;
  readonly titre: string;
}

/** Le repère sans hauteur d'une plage en cours ou d'une pause sans reprise, et la puce qui le nomme. */
export interface MarqueAffichee {
  readonly nature: 'plage' | 'pause';
  readonly haut: number;
  readonly puce: number;
  readonly lignes: readonly string[];
  readonly titre: string;
}

/** Ce qu'une colonne de l'agenda montre d'un jour : son en-tête, ses dessins placés, et ce qu'elle énonce. */
export interface ColonneAffichee {
  readonly cle: string;
  readonly jour: string;
  readonly aujourdhui: boolean;
  readonly vide: boolean;
  readonly duree: string;
  readonly presumees: string | undefined;
  readonly blocs: readonly BlocAffiche[];
  readonly notes: readonly NoteAffichee[];
  readonly pauses: readonly PauseAffichee[];
  readonly marques: readonly MarqueAffichee[];
  readonly enonces: readonly string[];
  readonly pointages: readonly string[];
}

const enonceDe = (dessin: Dessin): string => {
  switch (dessin.kind) {
    case 'PLAGE':
      return LIBELLES.enonceDePlage(dessin);
    case 'PLAGE_EN_COURS':
      return LIBELLES.enonceDePlageEnCours(dessin.debut);
    case 'PAUSE':
      return LIBELLES.enonceDePause(dessin.debut, dessin.fin);
    case 'PAUSE_SANS_REPRISE':
      return LIBELLES.enonceDePauseSansReprise(dessin.debut, dessin.enCours);
  }
};

const toBloc = (dessin: DessinDePlage): BlocAffiche => {
  const debut = LIBELLES.debutDeBloc(dessin.debut, dessin.depuisLaVeille);
  const fin = LIBELLES.finDeBloc(dessin.fin, dessin.seLePoursuit, dessin.presumee);
  return {
    haut: dessin.haut,
    hauteur: dessin.hauteur,
    classe: dessin.classe,
    presumee: dessin.presumee,
    depuisLaVeille: dessin.depuisLaVeille,
    seLePoursuit: dessin.seLePoursuit,
    debut,
    fin,
    bornes: LIBELLES.bornes(debut, fin),
    titre: enonceDe(dessin),
  };
};

const toNote = (note: NoteDePlagesCourtes): NoteAffichee => ({ haut: note.haut, lignes: note.plages.map(plage => toBloc(plage).bornes) });

const toPause = (dessin: DessinDePause): PauseAffichee => ({
  haut: dessin.haut,
  hauteur: dessin.hauteur,
  depuisLaVeille: dessin.depuisLaVeille,
  etiquetee: dessin.etiquetee,
  titre: enonceDe(dessin),
});

const toMarqueDePlage = (dessin: DessinDePlageEnCours, jour: JourDeReleve): MarqueAffichee => ({
  nature: 'plage',
  haut: dessin.haut,
  puce: dessin.puce.haut,
  lignes: [LIBELLES.puceEnCours(jour.typeDuPointageA(dessin.debut), dessin.debut), LIBELLES.enCours],
  titre: enonceDe(dessin),
});

const toMarqueDePause = (dessin: DessinDePauseSansReprise): MarqueAffichee => ({
  nature: 'pause',
  haut: dessin.haut,
  puce: dessin.puce.haut,
  lignes: dessin.enCours ? [LIBELLES.pucePause(dessin.debut), LIBELLES.enCours] : [LIBELLES.pucePause(dessin.debut)],
  titre: enonceDe(dessin),
});

const toMarques = (dessins: readonly Dessin[], jour: JourDeReleve): readonly MarqueAffichee[] =>
  dessins.flatMap(dessin => {
    if (dessin.kind === 'PLAGE_EN_COURS') {
      return [toMarqueDePlage(dessin, jour)];
    }
    return dessin.kind === 'PAUSE_SANS_REPRISE' ? [toMarqueDePause(dessin)] : [];
  });

/** L'agenda place, les libellés disent : cette projection réunit les deux pour le template, sans rien décider. */
export const toColonneAffichee = (agenda: AgendaDeLaSemaine, jour: JourDeReleve, aujourdhui: JourCalendaire): ColonneAffichee => {
  const estAujourdhui = jour.jour.estLeMeme(aujourdhui);
  const { dessins, notes } = agenda.colonne(jour, estAujourdhui);
  return {
    cle: jour.jour.value,
    jour: LIBELLES.jour(jour.jour),
    aujourdhui: estAujourdhui,
    vide: jour.estVide(),
    duree: jour.estVide() ? LIBELLES.sansValeur : LIBELLES.duree(jour.dureePointee),
    presumees: jour.dureePresumee.estNulle() ? undefined : LIBELLES.presumees(jour.dureePresumee),
    blocs: dessins.flatMap(dessin => (dessin.kind === 'PLAGE' ? [toBloc(dessin)] : [])),
    notes: notes.map(toNote),
    pauses: dessins.flatMap(dessin => (dessin.kind === 'PAUSE' ? [toPause(dessin)] : [])),
    marques: toMarques(dessins, jour),
    enonces: dessins.map(enonceDe),
    pointages: jour.pointages.map(pointage => LIBELLES.pointage(pointage.type, pointage.instant)),
  };
};
