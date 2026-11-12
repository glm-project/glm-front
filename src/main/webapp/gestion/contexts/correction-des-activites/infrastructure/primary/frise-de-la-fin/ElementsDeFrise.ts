import { formatInstantTimeWithSeconds } from '@/app/shared/date-format/infrastructure/primary/DateFormats';
import { ActiviteEchue, PointageDuDossier } from '../../../domain/fin-automatique/DossierDeLaFin';
import { LIBELLES_CORRECTION_DES_ACTIVITES } from '../LibellesCorrectionDesActivites';
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
import { echelleDe, EchelleFrise, finDuCadreDe, instantsDeLActivite, positionSur, positionTenueAuxBords } from './EchelleFrise';
import { PlacementDeLInstant, PoigneeDeFrise, texteDeLHeure } from './PoigneeDeFrise';
import { demarrageDeLaBorneDeLaFrise, pointagesDeLActivite } from './PointagesDeLaFrise';
import { heureDe, libelleActivite, libelleCategorie, libelleDuGeste } from './PresentationDeLaFrise';

export interface ContexteDeFrise {
  readonly now: Date;
  readonly echelle: EchelleFrise;
}

export const HAUTEUR_DE_L_AXE_PX = 28;
export const HAUTEUR_D_UN_ELEMENT_PX = 44;
export const ESPACE_ENTRE_RANGEES_PX = 8;

const QUALIFICATIFS = LIBELLES_CORRECTION_DES_ACTIVITES.regularisation.frise;

const nomDuRepere = (pointage: PointageDuDossier): string =>
  [formatInstantTimeWithSeconds(new Date(pointage.fait.instant)), libelleDuGeste(pointage.fait)].join(' · ');

export const repereDe = (pointage: PointageDuDossier): RepereASituer => ({
  kind: 'REPERE',
  instant: Date.parse(pointage.fait.instant),
  cle: `pointage:${pointage.id.value}`,
  pointage: pointage.id.value,
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
    cle: `activite:${activite.id.value}`,
    activite: activite.id.value,
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
  activite: readonly number[],
  borneDeFin: string | undefined,
  poignee: PoigneeDeFrise | undefined,
  placement: PlacementDeLInstant | undefined,
  cadreComplet: boolean,
): EchelleFrise => {
  if (!cadreComplet) return echelleDe(activite);
  const bornes = (poignee ?? placement)?.bornes;
  return echelleDe(activite, { borne: borneDeFin, plafond: bornes === undefined ? undefined : Date.parse(bornes.max) });
};

export const lectureDeLaFrise = ({ vue, poignee, placement, cadreComplet }: EntreesDeFrise) => {
  const pointages = pointagesDeLActivite(vue);
  return {
    pointages,
    demarrageDeLaBorne: demarrageDeLaBorneDeLaFrise(vue),
    finDuCadre: finDuCadreDe(vue.activite),
    echelle: echelleDeLaFrise(instantsDeLActivite(pointages, vue.activite), vue.borneDeFin, poignee, placement, cadreComplet),
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
  echeance: string,
  echelle: EchelleFrise,
  haut: number,
  largeur: number,
): PositionSansHeure => ({
  ...emplacementDeLaPoignee(
    echeance,
    placement,
    LIBELLES_CORRECTION_DES_ACTIVITES.regularisation.frise.heureInconnue,
    echelle,
    haut,
    largeur,
  ),
  heure: 'SANS_HEURE',
});

export const hauteurDeLaFrise = (elements: readonly ElementFrise[]): number =>
  Math.max(...elements.map(element => element.haut)) + HAUTEUR_D_UN_ELEMENT_PX + ESPACE_ENTRE_RANGEES_PX;
