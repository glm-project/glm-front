import { formatInstantTimeWithSeconds } from '@/app/shared/date-format/infrastructure/primary/DateFormats';
import { ActiviteAnomalie, PointageAnomalie } from '../../../domain/dossier/DossierAnomalie';
import { LIBELLES_ANOMALIES } from '../LibellesAnomalies';
import { heureDe, libelleActivite, libelleCategorie, libelleDuGeste } from '../PresentationDossier';
import {
  BarreFrise,
  ElementFrise,
  EmplacementDePoignee,
  EntreesDeFrise,
  FinDeBarre,
  PeriodeActivite,
  PositionAvecHeure,
  PositionSansHeure,
  RepereASituer,
} from './DispositionFrise';
import { echelleDe, EchelleFrise, instantsRecus, positionSur, positionTenueAuxBords } from './EchelleFrise';
import { PlacementDeLInstant, PoigneeDeFrise, texteDeLHeure } from './PoigneeDeFrise';
import { pointagesDeLaFrise } from './PointagesDeLaFrise';

export interface ContexteDeFrise {
  readonly now: Date;
  readonly echelle: EchelleFrise;
}

export const POSITION_DU_BORD = 100;
export const HAUTEUR_DE_L_AXE_PX = 28;
export const HAUTEUR_D_UN_ELEMENT_PX = 44;
export const ESPACE_ENTRE_RANGEES_PX = 8;
const ETATS_SANS_FIN_RECUE: readonly ActiviteAnomalie['etat'][] = ['EN_COURS'];

const QUALIFICATIFS = LIBELLES_ANOMALIES.frise;

const nomDuRepere = (pointage: PointageAnomalie): string =>
  [
    formatInstantTimeWithSeconds(new Date(pointage.fait.instant)),
    libelleDuGeste(pointage.fait),
    ...(pointage.regularisation ? [QUALIFICATIFS.regularise] : []),
  ].join(' · ');

export const repereDe = (pointage: PointageAnomalie): RepereASituer => ({
  kind: 'REPERE',
  instant: Date.parse(pointage.fait.instant),
  cle: `pointage:${pointage.id.pointage}`,
  pointage: pointage.id.pointage,
  nom: nomDuRepere(pointage),
  heure: heureDe(pointage.fait.instant),
  symbole: QUALIFICATIFS.symboles[pointage.fait.type],
  nonConformite: pointage.fait.type === 'NON_CONFORMITE',
  regularise: pointage.regularisation,
});

export const finRecueDe = (etat: ActiviteAnomalie['etat'], fin: string | undefined): string | undefined =>
  ETATS_SANS_FIN_RECUE.includes(etat) ? undefined : fin;

const finDeLaBarre = (etat: ActiviteAnomalie['etat'], fin: string | undefined): FinDeBarre => {
  if (fin === undefined) return 'OUVERTE';
  return etat === 'ECHUE' ? 'AUTOMATIQUE' : 'RECUE';
};

const barreCommune = (activite: ActiviteAnomalie, now: Date) => ({
  kind: 'BARRE' as const,
  cle: `activite:${activite.id.activite}`,
  activite: activite.id.activite,
  nom: `${libelleActivite(activite, now)} · ${LIBELLES_ANOMALIES.etats[activite.etat]}`,
  etat: activite.etat,
});

const barreAvecPeriode = (activite: ActiviteAnomalie, periode: PeriodeActivite, haut: number, contexte: ContexteDeFrise): BarreFrise => {
  const fin = finRecueDe(activite.etat, periode.fin);
  const gauche = positionSur(contexte.echelle, Date.parse(periode.debut));
  return {
    ...barreCommune(activite, contexte.now),
    instant: Date.parse(periode.debut),
    gauche,
    haut,
    largeur: (fin === undefined ? POSITION_DU_BORD : positionSur(contexte.echelle, Date.parse(fin))) - gauche,
    texte: `${libelleCategorie(periode.categorie)} · ${LIBELLES_ANOMALIES.etats[activite.etat]}`,
    categorie: periode.categorie,
    fin: finDeLaBarre(activite.etat, fin),
  };
};

const barreSansPeriode = (activite: ActiviteAnomalie, haut: number, now: Date): BarreFrise => ({
  ...barreCommune(activite, now),
  haut,
  instant: Infinity,
  gauche: 0,
  largeur: undefined,
  texte: activite.libelle,
  categorie: undefined,
  fin: undefined,
});

export const barreDe = (activite: ActiviteAnomalie, haut: number, contexte: ContexteDeFrise): BarreFrise =>
  activite.periode === undefined
    ? barreSansPeriode(activite, haut, contexte.now)
    : barreAvecPeriode(activite, activite.periode, haut, contexte);

const debutDe = (activite: ActiviteAnomalie): number => (activite.periode === undefined ? Infinity : Date.parse(activite.periode.debut));

export const parDebut = (activites: readonly ActiviteAnomalie[]): readonly ActiviteAnomalie[] =>
  [...activites].sort((premiere, seconde) => debutDe(premiere) - debutDe(seconde));

const instantsDeLEchelle = (
  pointages: readonly PointageAnomalie[],
  activites: readonly ActiviteAnomalie[],
  now: Date,
): readonly number[] => {
  const instants = instantsRecus(pointages, activites);
  return instants.length > 0 ? instants : [now.getTime()];
};

const echelleDeLaFrise = (
  instants: readonly number[],
  poignee: PoigneeDeFrise | undefined,
  placement: PlacementDeLInstant | undefined,
): EchelleFrise => {
  const bornes = (poignee ?? placement)?.bornes;
  return echelleDe(instants, bornes && Date.parse(bornes.max));
};

export const lectureDeLaFrise = ({ vue, maintenant, poignee, placement }: EntreesDeFrise) => {
  const pointages = pointagesDeLaFrise(vue);
  return {
    pointages,
    echelle: echelleDeLaFrise(instantsDeLEchelle(pointages, vue.activites, maintenant), poignee, placement),
  };
};

export const instantTenuSur = (poignee: Pick<PoigneeDeFrise, 'instant' | 'bornes'>, echelle: EchelleFrise): number =>
  Math.min(
    Math.max(Date.parse(poignee.instant), Date.parse(poignee.bornes.min), echelle.debut),
    Date.parse(poignee.bornes.max),
    echelle.fin,
  );

const emplacementDeLaPoignee = (
  instant: string,
  cadre: Pick<PoigneeDeFrise, 'bornes'>,
  etiquette: string,
  echelle: EchelleFrise,
  haut: number,
  largeur: number,
): EmplacementDePoignee => {
  const instantTenu = instantTenuSur({ instant, bornes: cadre.bornes }, echelle);
  return {
    kind: 'POIGNEE',
    cle: 'poignee',
    instant: instantTenu,
    gauche: positionTenueAuxBords(positionSur(echelle, instantTenu), largeur),
    haut,
    min: Date.parse(cadre.bornes.min),
    max: Date.parse(cadre.bornes.max),
    etiquette,
  };
};

export const positionDeLaPoignee = (poignee: PoigneeDeFrise, echelle: EchelleFrise, haut: number, largeur: number): PositionAvecHeure => {
  const texte = texteDeLHeure(poignee.instant);
  const emplacement = emplacementDeLaPoignee(poignee.instant, poignee, texte, echelle, haut, largeur);
  return { ...emplacement, heure: 'AVEC_HEURE', lecture: { valeur: emplacement.instant, texte }, source: poignee };
};

export const positionDeLaPoigneeSansHeure = (
  placement: PlacementDeLInstant,
  finRecue: string,
  echelle: EchelleFrise,
  haut: number,
  largeur: number,
): PositionSansHeure => ({
  ...emplacementDeLaPoignee(finRecue, placement, LIBELLES_ANOMALIES.frise.heureInconnue, echelle, haut, largeur),
  heure: 'SANS_HEURE',
  source: placement,
});

export const hauteurDeLaFrise = (elements: readonly ElementFrise[]): number =>
  Math.max(...elements.map(element => element.haut)) + HAUTEUR_D_UN_ELEMENT_PX + ESPACE_ENTRE_RANGEES_PX;
