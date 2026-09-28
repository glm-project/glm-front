import { JourDeReleve } from '../../../domain/releve/JourDeReleve';
import { JourCalendaire } from '../../../domain/semaine/JourCalendaire';
import { LIBELLES_RELEVE_DES_HEURES } from '../LibellesReleveDesHeures';
import { AgendaDeLaSemaine, ClasseDeHauteur, Dessin, DessinDePlage, DessinDePlageEnCours, NoteDePlagesCourtes } from './AgendaDeLaSemaine';

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

export interface MarqueAffichee {
  readonly haut: number;
  readonly puce: number;
  readonly lignes: readonly string[];
  readonly titre: string;
}

export interface ColonneAffichee {
  readonly cle: string;
  readonly jour: string;
  readonly aujourdhui: boolean;
  readonly vide: boolean;
  readonly duree: string;
  readonly presumees: string | undefined;
  readonly blocs: readonly BlocAffiche[];
  readonly notes: readonly NoteAffichee[];
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

const toMarqueDePlage = (dessin: DessinDePlageEnCours, jour: JourDeReleve): MarqueAffichee => ({
  haut: dessin.haut,
  puce: dessin.puce.haut,
  lignes: [LIBELLES.puceEnCours(jour.typeDuPointageA(dessin.debut), dessin.debut), LIBELLES.enCours],
  titre: enonceDe(dessin),
});

const toMarques = (dessins: readonly Dessin[], jour: JourDeReleve): readonly MarqueAffichee[] =>
  dessins.flatMap(dessin => (dessin.kind === 'PLAGE_EN_COURS' ? [toMarqueDePlage(dessin, jour)] : []));

export const toColonneAffichee = (agenda: AgendaDeLaSemaine, jour: JourDeReleve, aujourdhui: JourCalendaire): ColonneAffichee => {
  const estAujourdhui = jour.jour.estLeMeme(aujourdhui);
  const { dessins, notes } = agenda.colonne(jour);
  return {
    cle: jour.jour.value,
    jour: LIBELLES.jour(jour.jour),
    aujourdhui: estAujourdhui,
    vide: jour.estVide(),
    duree: jour.estVide() ? LIBELLES.sansValeur : LIBELLES.duree(jour.dureePointee),
    presumees: jour.dureePresumee.estNulle() ? undefined : LIBELLES.presumees(jour.dureePresumee),
    blocs: dessins.flatMap(dessin => (dessin.kind === 'PLAGE' ? [toBloc(dessin)] : [])),
    notes: notes.map(toNote),
    marques: toMarques(dessins, jour),
    enonces: dessins.map(enonceDe),
    pointages: jour.pointages.map(pointage => LIBELLES.pointage(pointage.type, pointage.instant)),
  };
};
