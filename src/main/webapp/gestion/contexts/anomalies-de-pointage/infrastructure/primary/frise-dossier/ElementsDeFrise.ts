import { formatInstantTimeWithSeconds } from '@/app/shared/date-format/infrastructure/primary/DateFormats';
import { ActiviteEchue, PointageAnomalie } from '../../../domain/dossier/DossierAnomalie';
import { LIBELLES_ANOMALIES } from '../LibellesAnomalies';
import { heureDe, libelleActivite, libelleCategorie, libelleDuGeste } from '../PresentationDossier';
import {
  BarreFrise,
  ClotureFrise,
  ElementFrise,
  EmplacementDePoignee,
  EntreesDeFrise,
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

export const HAUTEUR_DE_L_AXE_PX = 28;
export const HAUTEUR_D_UN_ELEMENT_PX = 44;
export const ESPACE_ENTRE_RANGEES_PX = 8;

const QUALIFICATIFS = LIBELLES_ANOMALIES.frise;

const nomDuRepere = (pointage: PointageAnomalie): string =>
  [formatInstantTimeWithSeconds(new Date(pointage.fait.instant)), libelleDuGeste(pointage.fait)].join(' · ');

export const repereDe = (pointage: PointageAnomalie): RepereASituer => ({
  kind: 'REPERE',
  instant: Date.parse(pointage.fait.instant),
  cle: `pointage:${pointage.id.pointage}`,
  pointage: pointage.id.pointage,
  nom: nomDuRepere(pointage),
  heure: heureDe(pointage.fait.instant),
  symbole: QUALIFICATIFS.symboles[pointage.fait.type],
  nonConformite: pointage.fait.type === 'NON_CONFORMITE',
});

export type ClotureASituer = Omit<ClotureFrise, 'gauche' | 'haut'>;

export const clotureDe = (borneDeFin: string): ClotureASituer => ({
  kind: 'CLOTURE',
  cle: 'cloture',
  instant: Date.parse(borneDeFin),
  nom: [formatInstantTimeWithSeconds(new Date(borneDeFin)), QUALIFICATIFS.cloture].join(' · '),
  heure: heureDe(borneDeFin),
});

export const barreDe = (activite: ActiviteEchue, haut: number, contexte: ContexteDeFrise): BarreFrise => {
  const gauche = positionSur(contexte.echelle, Date.parse(activite.debut));
  return {
    kind: 'BARRE',
    cle: `activite:${activite.id.activite}`,
    activite: activite.id.activite,
    nom: `${libelleActivite(activite, contexte.now)} · ${QUALIFICATIFS.finAutomatique}`,
    instant: Date.parse(activite.debut),
    gauche,
    haut,
    largeur: positionSur(contexte.echelle, Date.parse(activite.echeance)) - gauche,
    texte: `${libelleCategorie(activite.categorie)} · ${QUALIFICATIFS.finAutomatique}`,
    categorie: activite.categorie,
    fin: 'AUTOMATIQUE',
  };
};

const echelleDeLaFrise = (
  instants: readonly number[],
  poignee: PoigneeDeFrise | undefined,
  placement: PlacementDeLInstant | undefined,
): EchelleFrise => {
  const bornes = (poignee ?? placement)?.bornes;
  return echelleDe(instants, bornes && Date.parse(bornes.max));
};

export const lectureDeLaFrise = ({ vue, poignee, placement }: EntreesDeFrise) => {
  const pointages = pointagesDeLaFrise(vue);
  return {
    pointages,
    echelle: echelleDeLaFrise(instantsRecus(pointages, vue.activite, vue.borneDeFin), poignee, placement),
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
});

export const hauteurDeLaFrise = (elements: readonly ElementFrise[]): number =>
  Math.max(...elements.map(element => element.haut)) + HAUTEUR_D_UN_ELEMENT_PX + ESPACE_ENTRE_RANGEES_PX;
