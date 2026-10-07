import { InstantTimeAndLongDayWithSecondsPipe } from '@/app/shared/date-format/infrastructure/primary/InstantPipes';
import { ActiviteAnomalie, PointageAnomalie } from '../../../domain/dossier/DossierAnomalie';
import { identifiantsDesPointagesTardifs } from '../../../domain/dossier/PointagesTardifs';
import { LIBELLES_ANOMALIES } from '../LibellesAnomalies';
import { heureDe, libelleActivite, libelleCategorie, libelleDuGeste, tempsActivite } from '../PresentationDossier';
import { activitesModifiees, faitsDeLActe } from './ComparaisonDApercu';
import {
  ApercuDeFrise,
  BarreApres,
  BarreFrise,
  DispositionApres,
  ElementFrise,
  EntreesDeFrise,
  FinDeBarre,
  PeriodeActivite,
  PositionDePoignee,
  RepereFrise,
} from './DispositionFrise';
import { echelleDe, EchelleFrise, instantsRecus, positionSur, positionTenueAuxBords, surVoies } from './EchelleFrise';
import { PlacementDeLInstant, PoigneeDeFrise, texteDeLHeure } from './PoigneeDeFrise';
import { pointagesDeLaFrise } from './PointagesDeLaFrise';

export interface ContexteDeFrise {
  readonly now: Date;
  readonly tardifs: ReadonlySet<string>;
  readonly faitsDeLActe: ReadonlySet<string>;
  readonly echelle: EchelleFrise;
  readonly poignee: PoigneeDeFrise | undefined;
  readonly hautDesReperes: number;
  readonly largeur: number;
}

export const POSITION_DU_BORD = 100;
export const HAUTEUR_DE_L_AXE_PX = 28;
export const HAUTEUR_DU_TITRE_PX = 28;
export const HAUTEUR_D_UN_ELEMENT_PX = 44;
export const ESPACE_ENTRE_RANGEES_PX = 8;
const ETATS_SANS_FIN_RECUE: readonly ActiviteAnomalie['etat'][] = ['EN_COURS', 'A_RESOUDRE'];

const instantAvecSecondes = new InstantTimeAndLongDayWithSecondsPipe();
const QUALIFICATIFS = LIBELLES_ANOMALIES.frise;

interface DrapeauxDuRepere {
  readonly enCause: boolean;
  readonly deplace: boolean;
  readonly tardif: boolean;
  readonly faitDeLActe: boolean;
}

const nomDuRepere = (pointage: PointageAnomalie, drapeaux: DrapeauxDuRepere, now: Date): string =>
  [
    instantAvecSecondes.transform(pointage.fait.instant, now).time,
    libelleDuGeste(pointage.fait),
    ...(pointage.annulation ? [QUALIFICATIFS.annule] : []),
    ...(pointage.regularisation ? [QUALIFICATIFS.regularise] : []),
    ...(drapeaux.enCause ? [QUALIFICATIFS.enCause] : []),
    ...(drapeaux.tardif ? [QUALIFICATIFS.tardif] : []),
    ...(drapeaux.faitDeLActe ? [QUALIFICATIFS.faitDeLActe] : []),
    ...(drapeaux.deplace ? [QUALIFICATIFS.heureRemplacee] : []),
  ].join(' · ');

const symboleDuGeste = (fait: PointageAnomalie['fait']): string =>
  QUALIFICATIFS.symboles[fait.type][fait.intention] ?? QUALIFICATIFS.symboleInconnu;

const estDeplace = (pointage: PointageAnomalie, poignee: PoigneeDeFrise | undefined): boolean =>
  poignee?.origine === pointage.id.pointage && Date.parse(poignee.instant) !== Date.parse(pointage.fait.instant);

const gaucheDuRepere = (instant: number, contexte: ContexteDeFrise): number =>
  positionTenueAuxBords(positionSur(contexte.echelle, instant), contexte.largeur);

export const abscisseEnPixelsDuRepere = (pointage: PointageAnomalie, contexte: ContexteDeFrise): number =>
  (gaucheDuRepere(Date.parse(pointage.fait.instant), contexte) / POSITION_DU_BORD) * contexte.largeur;

export const repereDe = (pointage: PointageAnomalie, enCause: boolean, voie: number, contexte: ContexteDeFrise): RepereFrise => {
  const deplace = estDeplace(pointage, contexte.poignee);
  const tardif = contexte.tardifs.has(pointage.id.pointage);
  const faitDeLActe = contexte.faitsDeLActe.has(pointage.id.pointage);
  return {
    kind: 'REPERE',
    instant: Date.parse(pointage.fait.instant),
    gauche: gaucheDuRepere(Date.parse(pointage.fait.instant), contexte),
    haut: contexte.hautDesReperes + voie * HAUTEUR_D_UN_ELEMENT_PX,
    voie,
    cle: `pointage:${pointage.id.pointage}`,
    pointage: pointage.id.pointage,
    nom: nomDuRepere(pointage, { enCause, deplace, tardif, faitDeLActe }, contexte.now),
    selection: { kind: 'POINTAGE', id: pointage.id.pointage },
    heure: heureDe(pointage.fait.instant),
    symbole: symboleDuGeste(pointage.fait),
    nonConformite: pointage.fait.type === 'NON_CONFORMITE',
    annule: pointage.annulation !== undefined,
    regularise: pointage.regularisation,
    enCause,
    deplace,
    tardif,
    faitDeLActe,
    ancrage: 'CENTRE',
  };
};

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
  selection: { kind: 'ACTIVITE' as const, id: activite.id.activite },
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

export const hauteurDesReperes = (reperes: readonly RepereFrise[]): number =>
  (Math.max(-1, ...reperes.map(repere => repere.voie)) + 1) * HAUTEUR_D_UN_ELEMENT_PX;

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

export const lectureDeLaFrise = ({ vue, maintenant, poignee, placement, apercu }: EntreesDeFrise) => {
  const pointages = pointagesDeLaFrise(vue);
  const pointagesApres = apercu === undefined ? [] : pointagesDeLaFrise(apercu.apres);
  return {
    enCause: new Set(vue.diagnostics?.map(diagnostic => diagnostic.pointage.pointage)),
    pointages,
    pointagesApres,
    echelle: echelleDeLaFrise(
      instantsDeLEchelle([...pointages, ...pointagesApres], [...vue.activites, ...(apercu?.apres.activites ?? [])], maintenant),
      poignee,
      placement,
    ),
    tardifs: identifiantsDesPointagesTardifs(vue.choix ?? []),
  };
};

export const instantTenuSur = (poignee: PoigneeDeFrise, echelle: EchelleFrise): number =>
  Math.min(
    Math.max(Date.parse(poignee.instant), Date.parse(poignee.bornes.min), echelle.debut),
    Date.parse(poignee.bornes.max),
    echelle.fin,
  );

export const positionDeLaPoignee = (poignee: PoigneeDeFrise, echelle: EchelleFrise, haut: number, largeur: number): PositionDePoignee => ({
  kind: 'POIGNEE',
  cle: 'poignee',
  instant: instantTenuSur(poignee, echelle),
  gauche: positionTenueAuxBords(positionSur(echelle, instantTenuSur(poignee, echelle)), largeur),
  haut,
  min: Date.parse(poignee.bornes.min),
  max: Date.parse(poignee.bornes.max),
  valeur: instantTenuSur(poignee, echelle),
  texte: texteDeLHeure(poignee.instant),
  desactivee: poignee.desactivee,
  source: poignee,
});

const barreApresDe = (activite: ActiviteAnomalie, haut: number, modifiee: boolean, contexte: ContexteDeFrise): BarreApres => {
  const barre = barreDe(activite, haut, contexte);
  const temps = tempsActivite(activite);
  return {
    ...barre,
    modifiee,
    nom: [barre.nom, temps, modifiee ? QUALIFICATIFS.modifiee : ''].filter(Boolean).join(' · '),
    texte: [barre.texte, temps].filter(Boolean).join(' · '),
  };
};

export const dispositionApres = (
  apercu: ApercuDeFrise,
  pointages: readonly PointageAnomalie[],
  haut: number,
  contexte: ContexteDeFrise,
): DispositionApres => {
  const modifiees = activitesModifiees(apercu.avant.activites, apercu.apres.activites);
  const poses = faitsDeLActe(apercu.avant.journal, apercu.apres.journal);
  const reperes = surVoies(pointages, pointage => abscisseEnPixelsDuRepere(pointage, contexte)).map(({ element, voie }) => ({
    ...repereDe(element, false, voie, { ...contexte, poignee: undefined, tardifs: new Set(), faitsDeLActe: poses }),
    haut: HAUTEUR_DU_TITRE_PX + voie * HAUTEUR_D_UN_ELEMENT_PX,
  }));
  const hautDesBarres = HAUTEUR_DU_TITRE_PX + hauteurDesReperes(reperes) + ESPACE_ENTRE_RANGEES_PX;
  const barres = parDebut(apercu.apres.activites).map((activite, rang) =>
    barreApresDe(
      activite,
      hautDesBarres + rang * (HAUTEUR_D_UN_ELEMENT_PX + ESPACE_ENTRE_RANGEES_PX),
      modifiees.has(activite.id.activite),
      contexte,
    ),
  );
  return {
    haut,
    hauteur: Math.max(HAUTEUR_DU_TITRE_PX, ...[...reperes, ...barres].map(element => element.haut + HAUTEUR_D_UN_ELEMENT_PX)),
    reperes,
    barres,
  };
};

export const hauteurDeLaFrise = (
  elements: readonly ElementFrise[],
  hautDeLaPoignee: number | undefined,
  apres: DispositionApres | undefined,
): number =>
  Math.max(
    Math.max(...elements.map(element => element.haut), ...(hautDeLaPoignee === undefined ? [] : [hautDeLaPoignee]))
      + HAUTEUR_D_UN_ELEMENT_PX
      + ESPACE_ENTRE_RANGEES_PX,
    ...(apres === undefined ? [] : [apres.haut + apres.hauteur + ESPACE_ENTRE_RANGEES_PX]),
  );
