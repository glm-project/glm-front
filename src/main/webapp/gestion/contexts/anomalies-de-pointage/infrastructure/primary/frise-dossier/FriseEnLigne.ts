import { InstantPointage } from '../../../domain/acte/InstantPointage';
import { conflitAExpliquer } from '../../../domain/dossier/ConflitAExpliquer';
import { ActiviteAnomalie, PointageAnomalie } from '../../../domain/dossier/DossierAnomalie';
import { LIBELLES_ANOMALIES } from '../LibellesAnomalies';
import { activitesModifiees } from './ComparaisonDApercu';
import {
  ApercuDeFrise,
  BarreFrise,
  DispositionFrise,
  EntreesDeFrise,
  FinRecueDeFrise,
  PositionDePoignee,
  RangeeDePlacement,
  RepereFrise,
  RetraitDeFrise,
  VueDeFrise,
} from './DispositionFrise';
import { EchelleFrise, graduationsDe, positionSur } from './EchelleFrise';
import {
  barreApresDe,
  barreDe,
  ContexteDeFrise,
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
  positionDeLaPoigneeSansHeure,
  repereDe,
} from './ElementsDeFrise';
import { PlacementDeLInstant, PoigneeDeFrise, texteDeLHeure } from './PoigneeDeFrise';
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
  return !conflitAExpliquer(vue) && pointages.length > 0 && pointages.every(pointage => tientSurUneBarre(vue, pointage));
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

interface EtatRecuPourLaBarre {
  readonly activite: ActiviteAnomalie;
  readonly modifiee: boolean;
}

const etatRecuPourLaBarre = (apercu: ApercuDeFrise | undefined, cible: ActiviteAnomalie | undefined): EtatRecuPourLaBarre | undefined => {
  if (apercu === undefined) return undefined;
  const activite = apercu.apres.activites.find(candidate => candidate.id.activite === cible?.id.activite);
  if (activite === undefined) return undefined;
  const modifiees = activitesModifiees(apercu.avant.activites, apercu.apres.activites);
  return [...modifiees].every(identifiant => identifiant === activite.id.activite)
    ? { activite, modifiee: modifiees.has(activite.id.activite) }
    : undefined;
};

const barreQuiDitLEtatRecu = (barre: BarreFrise, { activite, modifiee }: EtatRecuPourLaBarre, contexte: ContexteDeFrise): BarreFrise => {
  const { nom, texte, etat } = barreApresDe(activite, barre.haut, modifiee, contexte);
  return { ...barre, nom, texte, etat, modifiee };
};

const barreDeLaPoignee = (
  barre: BarreFrise,
  poignee: PoigneeDeFrise,
  recu: EtatRecuPourLaBarre | undefined,
  contexte: ContexteDeFrise,
): BarreFrise => barreJusquALaPoignee(recu === undefined ? barre : barreQuiDitLEtatRecu(barre, recu, contexte), poignee, contexte.echelle);

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
        surLaBarreDe: visee.activite.id.activite,
      };

export const dispositionEnLigne = (entrees: EntreesDeFrise): DispositionFrise => {
  const { vue, maintenant: now, poignee, placement, apercu, largeur } = entrees;
  const { enCause, pointages, pointagesApres, echelle, tardifs } = lectureDeLaFrise(entrees);
  const contexte = { now, echelle, poignee, tardifs, faitsDeLActe: new Set<string>(), hautDesReperes: HAUTEUR_DE_L_AXE_PX, largeur };
  const cible = vue.activites.find(activite => activite.id.activite === (poignee ?? placement)?.activiteVisee);
  const hautDesActivites = HAUTEUR_DE_L_AXE_PX + ESPACE_ENTRE_RANGEES_PX;
  const recu = poignee === undefined ? undefined : etatRecuPourLaBarre(apercu, cible);
  const rangees = parDebut(vue.activites).map((activite, rang): RangeeDActivite => {
    const barre = barreDe(activite, hautDesActivites + rang * (HAUTEUR_D_UN_ELEMENT_PX + ESPACE_ENTRE_RANGEES_PX), contexte);
    return { activite, barre: poignee !== undefined && activite === cible ? barreDeLaPoignee(barre, poignee, recu, contexte) : barre };
  });
  const visee = rangees.find(({ activite }) => activite === cible);
  const surSaBarre = poignee === undefined || visee === undefined ? undefined : { ...visee, poignee };
  const barres = rangees.map(({ barre }) => barre);
  const reperes = pointages.flatMap((pointage): readonly RepereFrise[] => {
    const repere = repereDe(pointage, enCause.has(pointage.id.pointage), 0, contexte);
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
  const positionDePoignee = positionsDePoignee(entrees, visee, echelle, largeur);
  const apres =
    apercu === undefined || recu !== undefined
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
    rangeeDePlacement: rangeeDePlacementSur(placement, visee),
    apres,
  };
};
