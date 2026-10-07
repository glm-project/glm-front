import { InstantPointage } from '../../../domain/acte/InstantPointage';
import { ActiviteAnomalie, PointageAnomalie } from '../../../domain/dossier/DossierAnomalie';
import { DispositionFrise, EntreesDeFrise, RepereFrise, VueDeFrise } from './DispositionFrise';
import { graduationsDe, positionSur } from './EchelleFrise';
import {
  barreDe,
  dispositionApres,
  ESPACE_ENTRE_RANGEES_PX,
  finRecueDe,
  HAUTEUR_D_UN_ELEMENT_PX,
  HAUTEUR_DE_L_AXE_PX,
  hauteurDeLaFrise,
  lectureDeLaFrise,
  parDebut,
  POSITION_DU_BORD,
  positionDeLaPoignee,
  repereDe,
} from './ElementsDeFrise';
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

export const dispositionEnLigne = (entrees: EntreesDeFrise): DispositionFrise => {
  const { vue, maintenant: now, poignee, placement, apercu, largeur } = entrees;
  const { enCause, pointages, pointagesApres, echelle, tardifs } = lectureDeLaFrise(entrees);
  const contexte = { now, echelle, poignee, tardifs, faitsDeLActe: new Set<string>(), hautDesReperes: HAUTEUR_DE_L_AXE_PX, largeur };
  const hauteurDeLaSaisie = poignee === undefined && placement === undefined ? 0 : HAUTEUR_D_UN_ELEMENT_PX;
  const hautDesActivites = HAUTEUR_DE_L_AXE_PX + hauteurDeLaSaisie + ESPACE_ENTRE_RANGEES_PX;
  const rangees = parDebut(vue.activites).map((activite, rang) => ({
    activite,
    barre: barreDe(activite, hautDesActivites + rang * (HAUTEUR_D_UN_ELEMENT_PX + ESPACE_ENTRE_RANGEES_PX), contexte),
  }));
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
  const positionDePoignee = poignee === undefined ? [] : [positionDeLaPoignee(poignee, echelle, HAUTEUR_DE_L_AXE_PX, largeur)];
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
    rangeeDePlacement:
      placement === undefined
        ? undefined
        : { haut: HAUTEUR_DE_L_AXE_PX, hauteur: HAUTEUR_D_UN_ELEMENT_PX, desactivee: placement.desactivee, source: placement },
    apres,
  };
};
