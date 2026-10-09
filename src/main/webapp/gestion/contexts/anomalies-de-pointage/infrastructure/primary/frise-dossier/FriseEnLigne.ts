import { ActiviteEchue } from '../../../domain/dossier/DossierAnomalie';
import { LIBELLES_ANOMALIES } from '../LibellesAnomalies';
import {
  BarreFrise,
  DispositionFrise,
  EntreesDeFrise,
  FinAutomatiqueDeFrise,
  PositionDePoignee,
  RangeeDePlacement,
  RepereFrise,
  RetraitDeFrise,
} from './DispositionFrise';
import {
  EchelleFrise,
  graduationsDe,
  LARGEUR_D_UN_REPERE_PX,
  LARGEUR_DE_LA_CLOTURE_PX,
  positionDeRepereTenueAuBordDroit,
  positionSur,
} from './EchelleFrise';
import {
  barreDe,
  clotureDe,
  ESPACE_ENTRE_RANGEES_PX,
  HAUTEUR_D_UN_ELEMENT_PX,
  HAUTEUR_DE_L_AXE_PX,
  hauteurDeLaFrise,
  instantTenuSur,
  lectureDeLaFrise,
  positionDeLaPoignee,
  positionDeLaPoigneeSansHeure,
  repereDe,
} from './ElementsDeFrise';
import { PlacementDeLInstant, PoigneeDeFrise, texteDeLHeure } from './PoigneeDeFrise';
import { clotureDeLaFrise } from './PointagesDeLaFrise';

const barreJusquALaPoignee = (barre: BarreFrise, poignee: PoigneeDeFrise, echelle: EchelleFrise): BarreFrise => ({
  ...barre,
  largeur: positionSur(echelle, instantTenuSur(poignee, echelle)) - barre.gauche,
  fin: 'PROPOSEE',
  nom: `${barre.nom} · ${LIBELLES_ANOMALIES.frise.heureProposee} ${texteDeLHeure(poignee.instant)}`,
});

const retraitDe = (
  activite: ActiviteEchue,
  barre: BarreFrise,
  poignee: PoigneeDeFrise,
  echelle: EchelleFrise,
): RetraitDeFrise | undefined => {
  const gauche = positionSur(echelle, instantTenuSur(poignee, echelle));
  const largeur = positionSur(echelle, Date.parse(activite.echeance)) - gauche;
  return largeur > 0 ? { gauche, largeur, haut: barre.haut } : undefined;
};

const finAutomatiqueTraceeDe = (activite: ActiviteEchue, barre: BarreFrise, echelle: EchelleFrise): FinAutomatiqueDeFrise => ({
  gauche: positionSur(echelle, Date.parse(activite.echeance)),
  haut: barre.haut,
  texte: `${LIBELLES_ANOMALIES.frise.finAutomatique} ${texteDeLHeure(activite.echeance)}`,
});

const positionsDePoignee = (
  { poignee, placement }: Pick<EntreesDeFrise, 'poignee' | 'placement'>,
  activite: ActiviteEchue,
  barre: BarreFrise,
  echelle: EchelleFrise,
  largeur: number,
): readonly PositionDePoignee[] => {
  if (poignee !== undefined) return [positionDeLaPoignee(poignee, echelle, barre.haut, largeur)];
  return placement === undefined ? [] : [positionDeLaPoigneeSansHeure(placement, activite.echeance, echelle, barre.haut, largeur)];
};

const rangeeDePlacementSur = (placement: PlacementDeLInstant | undefined, barre: BarreFrise): RangeeDePlacement | undefined =>
  placement === undefined ? undefined : { haut: barre.haut, hauteur: HAUTEUR_D_UN_ELEMENT_PX };

const gaucheDuRepere = (echelle: EchelleFrise, instant: string, largeur: number, largeurDuRepere: number): number =>
  positionDeRepereTenueAuBordDroit(positionSur(echelle, Date.parse(instant)), largeur, largeurDuRepere);

export const dispositionDeFrise = (entrees: EntreesDeFrise): DispositionFrise => {
  const { vue, maintenant: now, poignee, placement, largeur } = entrees;
  const { pointages, echelle } = lectureDeLaFrise(entrees);
  const activite = vue.activite;
  const haut = HAUTEUR_DE_L_AXE_PX + ESPACE_ENTRE_RANGEES_PX;
  const barreRecue = barreDe(activite, haut, { now, echelle });
  const barre = poignee === undefined ? barreRecue : barreJusquALaPoignee(barreRecue, poignee, echelle);
  const reperes = pointages.map((pointage): RepereFrise => ({
    ...repereDe(pointage),
    gauche: gaucheDuRepere(echelle, pointage.fait.instant, largeur, LARGEUR_D_UN_REPERE_PX),
    haut,
  }));
  const borne = clotureDeLaFrise(vue);
  const clotures =
    borne === undefined ? [] : [{ ...clotureDe(borne), gauche: gaucheDuRepere(echelle, borne, largeur, LARGEUR_DE_LA_CLOTURE_PX), haut }];
  const elements = [barre, ...reperes, ...clotures, ...positionsDePoignee(entrees, activite, barre, echelle, largeur)].sort(
    (gauche, droite) => gauche.instant - droite.instant,
  );
  return {
    echelle,
    hauteur: hauteurDeLaFrise(elements),
    graduations: graduationsDe(echelle, largeur),
    elements,
    retrait: poignee === undefined ? undefined : retraitDe(activite, barre, poignee, echelle),
    finAutomatique: poignee === undefined ? undefined : finAutomatiqueTraceeDe(activite, barre, echelle),
    rangeeDePlacement: rangeeDePlacementSur(placement, barre),
  };
};
