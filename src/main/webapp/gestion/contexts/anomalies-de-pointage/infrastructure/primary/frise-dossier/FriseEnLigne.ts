import { InstantPointage } from '../../../domain/acte/InstantPointage';
import { ActiviteAnomalie, PointageAnomalie } from '../../../domain/dossier/DossierAnomalie';
import { LIBELLES_ANOMALIES } from '../LibellesAnomalies';
import { BarreFrise, DispositionFrise, EntreesDeFrise, FinRecueDeFrise, RepereFrise, RetraitDeFrise, VueDeFrise } from './DispositionFrise';
import { EchelleFrise, graduationsDe, positionSur } from './EchelleFrise';
import {
  barreDe,
  dispositionApres,
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
  repereDe,
} from './ElementsDeFrise';
import { PoigneeDeFrise, texteDeLHeure } from './PoigneeDeFrise';
import { pointagesDeLaFrise } from './PointagesDeLaFrise';

const LARGEUR_DE_DEUX_CIBLES_PX = 2 * HAUTEUR_D_UN_ELEMENT_PX;

const ouvre = (activite: ActiviteAnomalie, pointage: PointageAnomalie): boolean => activite.ouvrant.pointage === pointage.id.pointage;

const termineAuBout = (activite: ActiviteAnomalie, pointage: PointageAnomalie): boolean => {
  const fin = finRecueDe(activite.etat, activite.periode?.fin);
  return (
    fin !== undefined
    && pointage.fait.activiteVisee === activite.id.activite
    && new InstantPointage(pointage.fait.instant).compareTo(new InstantPointage(fin)) === 0
  );
};

const tientSurUneBarre = (vue: VueDeFrise, pointage: PointageAnomalie): boolean =>
  pointage.annulation === undefined && vue.activites.some(activite => ouvre(activite, pointage) || termineAuBout(activite, pointage));

export const seLitEnLigne = (vue: VueDeFrise): boolean => {
  const pointages = pointagesDeLaFrise(vue);
  return !vue.enConflit && pointages.length > 0 && pointages.every(pointage => tientSurUneBarre(vue, pointage));
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

const reserveLaRangeeDeSaisie = (
  placement: EntreesDeFrise['placement'],
  poignee: PoigneeDeFrise | undefined,
  cible: ActiviteAnomalie | undefined,
): boolean => placement !== undefined || (poignee !== undefined && cible === undefined);

export const dispositionEnLigne = (entrees: EntreesDeFrise): DispositionFrise => {
  const { vue, maintenant: now, poignee, placement, apercu, largeur } = entrees;
  const { enCause, pointages, pointagesApres, echelle, tardifs } = lectureDeLaFrise(entrees);
  const contexte = { now, echelle, poignee, tardifs, faitsDeLActe: new Set<string>(), hautDesReperes: HAUTEUR_DE_L_AXE_PX, largeur };
  const cible = vue.activites.find(activite => activite.id.activite === poignee?.activiteVisee);
  const hautDesActivites =
    HAUTEUR_DE_L_AXE_PX + (reserveLaRangeeDeSaisie(placement, poignee, cible) ? HAUTEUR_D_UN_ELEMENT_PX : 0) + ESPACE_ENTRE_RANGEES_PX;
  const rangees = parDebut(vue.activites).map((activite, rang): RangeeDActivite => {
    const barre = barreDe(activite, hautDesActivites + rang * (HAUTEUR_D_UN_ELEMENT_PX + ESPACE_ENTRE_RANGEES_PX), contexte);
    return { activite, barre: poignee !== undefined && activite === cible ? barreJusquALaPoignee(barre, poignee, echelle) : barre };
  });
  const visee = rangees.find(({ activite }) => activite === cible);
  const surSaBarre = poignee === undefined || visee === undefined ? undefined : { ...visee, poignee };
  const barres = rangees.map(({ barre }) => barre);
  const reperes = rangees.flatMap(({ activite, barre }) =>
    pointages.flatMap((pointage): readonly RepereFrise[] => {
      const repere = repereDe(pointage, enCause.has(pointage.id.pointage), 0, contexte);
      if (ouvre(activite, pointage)) return [{ ...repere, gauche: barre.gauche, haut: barre.haut, ancrage: 'GAUCHE' }];
      if (termineAuBout(activite, pointage)) {
        const gauche = positionSur(echelle, repere.instant);
        const barreEtroite = ((gauche - barre.gauche) / POSITION_DU_BORD) * largeur < LARGEUR_DE_DEUX_CIBLES_PX;
        return [{ ...repere, gauche, haut: barre.haut, ancrage: barreEtroite ? 'GAUCHE' : 'DROITE' }];
      }
      return [];
    }),
  );
  const positionDePoignee =
    poignee === undefined ? [] : [positionDeLaPoignee(poignee, echelle, visee?.barre.haut ?? HAUTEUR_DE_L_AXE_PX, largeur)];
  const apres =
    apercu === undefined
      ? undefined
      : dispositionApres(
          apercu,
          pointagesApres,
          hautDesActivites + barres.length * (HAUTEUR_D_UN_ELEMENT_PX + ESPACE_ENTRE_RANGEES_PX),
          contexte,
        );
  const elements = [...barres, ...reperes, ...positionDePoignee].sort((gauche, droite) => gauche.instant - droite.instant);
  return {
    enLigne: true,
    echelle,
    hauteur: hauteurDeLaFrise(elements, undefined, apres),
    graduations: graduationsDe(echelle, largeur),
    intituleDesPointages: undefined,
    fleches: [],
    elements,
    retrait: surSaBarre === undefined ? undefined : retraitDe(surSaBarre, echelle),
    finRecue: surSaBarre === undefined ? undefined : finRecueTraceeDe(surSaBarre, echelle),
    rangeeDePlacement:
      placement === undefined
        ? undefined
        : { haut: HAUTEUR_DE_L_AXE_PX, hauteur: HAUTEUR_D_UN_ELEMENT_PX, desactivee: placement.desactivee, source: placement },
    apres,
  };
};
