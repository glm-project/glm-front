import { InstantPointage } from '../../../domain/acte/InstantPointage';
import { ActiviteAnomalie, PointageAnomalie } from '../../../domain/dossier/DossierAnomalie';
import { LIBELLES_ANOMALIES } from '../LibellesAnomalies';
import {
  BarreFrise,
  DispositionFrise,
  EntreesDeFrise,
  FinRecueDeFrise,
  PositionDePoignee,
  RangeeDePlacement,
  RepereFrise,
  RetraitDeFrise,
} from './DispositionFrise';
import { EchelleFrise, graduationsDe, positionSur } from './EchelleFrise';
import {
  barreDe,
  ESPACE_ENTRE_RANGEES_PX,
  finRecueDe,
  HAUTEUR_D_UN_ELEMENT_PX,
  HAUTEUR_DE_L_AXE_PX,
  hauteurDeLaFrise,
  instantTenuSur,
  lectureDeLaFrise,
  parDebut,
  POSITION_DU_BORD,
  positionDeLaPoignee,
  positionDeLaPoigneeSansHeure,
  repereDe,
} from './ElementsDeFrise';
import { PlacementDeLInstant, PoigneeDeFrise, texteDeLHeure } from './PoigneeDeFrise';

const LARGEUR_DE_DEUX_CIBLES_PX = 2 * HAUTEUR_D_UN_ELEMENT_PX;

const ouvre = (activite: ActiviteAnomalie, pointage: PointageAnomalie): boolean =>
  activite.periode !== undefined && activite.ouvrant.pointage === pointage.id.pointage;

const termineAuBout = (activite: ActiviteAnomalie, pointage: PointageAnomalie): boolean => {
  const fin = finRecueDe(activite.etat, activite.periode?.fin);
  return (
    fin !== undefined
    && pointage.fait.activiteVisee === activite.id.activite
    && new InstantPointage(pointage.fait.instant).compareTo(new InstantPointage(fin)) === 0
  );
};

interface RangeeDActivite {
  readonly activite: ActiviteAnomalie;
  readonly barre: BarreFrise;
}

interface PoigneeSurSaBarre extends RangeeDActivite {
  readonly poignee: PoigneeDeFrise;
}

const barreJusquALaPoignee = (barre: BarreFrise, poignee: PoigneeDeFrise, echelle: EchelleFrise): BarreFrise => ({
  ...barre,
  largeur: positionSur(echelle, instantTenuSur(poignee, echelle)) - barre.gauche,
  fin: 'PROPOSEE',
  nom: `${barre.nom} · ${LIBELLES_ANOMALIES.frise.heureProposee} ${texteDeLHeure(poignee.instant)}`,
});

const retraitDe = ({ activite, barre, poignee }: PoigneeSurSaBarre, echelle: EchelleFrise): RetraitDeFrise | undefined => {
  const fin = finRecueDe(activite.etat, activite.periode?.fin);
  if (fin === undefined) return undefined;
  const gauche = positionSur(echelle, instantTenuSur(poignee, echelle));
  const largeur = positionSur(echelle, Date.parse(fin)) - gauche;
  return largeur > 0 ? { gauche, largeur, haut: barre.haut } : undefined;
};

const finRecueTraceeDe = ({ activite, barre }: PoigneeSurSaBarre, echelle: EchelleFrise): FinRecueDeFrise | undefined => {
  const fin = activite.periode?.fin;
  return activite.etat === 'ECHUE' && fin !== undefined
    ? {
        gauche: positionSur(echelle, Date.parse(fin)),
        haut: barre.haut,
        texte: `${LIBELLES_ANOMALIES.frise.finAutomatique} ${texteDeLHeure(fin)}`,
      }
    : undefined;
};

const positionsDePoignee = (
  { poignee, placement }: Pick<EntreesDeFrise, 'poignee' | 'placement'>,
  visee: RangeeDActivite | undefined,
  echelle: EchelleFrise,
  largeur: number,
): readonly PositionDePoignee[] => {
  if (visee === undefined) return [];
  if (poignee !== undefined) return [positionDeLaPoignee(poignee, echelle, visee.barre.haut, largeur)];
  const fin = finRecueDe(visee.activite.etat, visee.activite.periode?.fin);
  return placement === undefined || fin === undefined
    ? []
    : [positionDeLaPoigneeSansHeure(placement, fin, echelle, visee.barre.haut, largeur)];
};

const rangeeDePlacementSur = (
  placement: PlacementDeLInstant | undefined,
  visee: RangeeDActivite | undefined,
): RangeeDePlacement | undefined =>
  placement === undefined || visee === undefined
    ? undefined
    : {
        haut: visee.barre.haut,
        hauteur: HAUTEUR_D_UN_ELEMENT_PX,
        desactivee: placement.desactivee,
        source: placement,
      };

export const dispositionDeFrise = (entrees: EntreesDeFrise): DispositionFrise => {
  const { vue, maintenant: now, poignee, placement, largeur } = entrees;
  const { enCause, pointages, echelle } = lectureDeLaFrise(entrees);
  const contexte = { now, echelle };
  const cible = vue.activites.find(activite => activite.id.activite === (poignee ?? placement)?.activiteVisee);
  const hautDesActivites = HAUTEUR_DE_L_AXE_PX + ESPACE_ENTRE_RANGEES_PX;
  const rangees = parDebut(vue.activites).map((activite, rang): RangeeDActivite => {
    const barre = barreDe(activite, hautDesActivites + rang * (HAUTEUR_D_UN_ELEMENT_PX + ESPACE_ENTRE_RANGEES_PX), contexte);
    return { activite, barre: poignee !== undefined && activite === cible ? barreJusquALaPoignee(barre, poignee, echelle) : barre };
  });
  const visee = rangees.find(({ activite }) => activite === cible);
  const surSaBarre = poignee === undefined || visee === undefined ? undefined : { ...visee, poignee };
  const barres = rangees.map(({ barre }) => barre);
  const reperes = pointages.flatMap((pointage): readonly RepereFrise[] => {
    const repere = repereDe(pointage, enCause.has(pointage.id.pointage));
    const ouvertes = rangees.filter(({ activite }) => ouvre(activite, pointage));
    if (ouvertes.length > 0) return ouvertes.map(({ barre }) => ({ ...repere, gauche: barre.gauche, haut: barre.haut, ancrage: 'GAUCHE' }));
    return rangees
      .filter(({ activite }) => termineAuBout(activite, pointage))
      .map(({ barre }) => {
        const gauche = positionSur(echelle, repere.instant);
        const barreEtroite = ((gauche - barre.gauche) / POSITION_DU_BORD) * largeur < LARGEUR_DE_DEUX_CIBLES_PX;
        return { ...repere, gauche, haut: barre.haut, ancrage: barreEtroite ? 'GAUCHE' : 'DROITE' };
      });
  });
  const elements = [...barres, ...reperes, ...positionsDePoignee(entrees, visee, echelle, largeur)].sort(
    (gauche, droite) => gauche.instant - droite.instant,
  );
  return {
    echelle,
    hauteur: hauteurDeLaFrise(elements),
    graduations: graduationsDe(echelle, largeur),
    elements,
    retrait: surSaBarre === undefined ? undefined : retraitDe(surSaBarre, echelle),
    finRecue: surSaBarre === undefined ? undefined : finRecueTraceeDe(surSaBarre, echelle),
    rangeeDePlacement: rangeeDePlacementSur(placement, visee),
  };
};
