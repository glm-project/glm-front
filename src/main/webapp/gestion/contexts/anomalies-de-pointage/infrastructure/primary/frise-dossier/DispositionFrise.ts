import { InstantTimeAndLongDayWithSecondsPipe } from '@/app/shared/date-format/infrastructure/primary/InstantPipes';
import { ChronologiePointages } from '../../../domain/dossier/ChronologiePointages';
import { ActiviteAnomalie, DiagnosticConflit, DossierAnomalie, PointageAnomalie } from '../../../domain/dossier/DossierAnomalie';
import { LIBELLES_ANOMALIES } from '../LibellesAnomalies';
import { heureDe, libelleActivite, libelleCategorie, libelleDuGeste } from '../PresentationDossier';
import { SelectionDuDossier } from '../SelectionDuDossier';
import { echelleDe, EchelleFrise, Graduation, graduationsDe, largeurMinimaleDe, positionSur, surVoies } from './EchelleFrise';
import { PoigneeDeFrise, texteDeLHeure } from './PoigneeDeFrise';

export type VueDeFrise = Pick<DossierAnomalie, 'journal' | 'activites' | 'diagnostics'>;

export type FinDeBarre = 'RECUE' | 'AUTOMATIQUE' | 'OUVERTE';

export interface BarreFrise {
  readonly kind: 'BARRE';
  readonly cle: string;
  readonly instant: number;
  readonly gauche: number;
  readonly haut: number;
  readonly largeur: number | undefined;
  readonly activite: string;
  readonly texte: string;
  readonly selection: SelectionDuDossier;
  readonly nom: string;
  readonly categorie: CategorieDeBarre | undefined;
  readonly etat: ActiviteAnomalie['etat'];
  readonly fin: FinDeBarre | undefined;
}

export interface RepereFrise {
  readonly kind: 'REPERE';
  readonly cle: string;
  readonly instant: number;
  readonly gauche: number;
  readonly haut: number;
  readonly voie: number;
  readonly pointage: string;
  readonly nom: string;
  readonly selection: SelectionDuDossier;
  readonly heure: string;
  readonly symbole: string;
  readonly nonConformite: boolean;
  readonly annule: boolean;
  readonly regularise: boolean;
  readonly enCause: boolean;
  readonly deplace: boolean;
}

export type ElementFrise = BarreFrise | RepereFrise;

export interface FlecheFrise {
  readonly cle: string;
  readonly pointage: string;
  readonly activite: string;
  readonly departGauche: number;
  readonly departHaut: number;
  readonly arriveeGauche: number;
  readonly arriveeHaut: number;
}

export interface PositionDePoignee {
  readonly gauche: number;
  readonly haut: number;
  readonly min: number;
  readonly max: number;
  readonly valeur: number;
  readonly texte: string;
  readonly desactivee: boolean;
  readonly source: PoigneeDeFrise;
}

export interface DispositionFrise {
  readonly echelle: EchelleFrise;
  readonly largeurMinimale: number;
  readonly hauteur: number;
  readonly graduations: readonly Graduation[];
  readonly fleches: readonly FlecheFrise[];
  readonly elements: readonly ElementFrise[];
  readonly poignee: PositionDePoignee | undefined;
}

type PeriodeActivite = NonNullable<ActiviteAnomalie['periode']>;
type CategorieDeBarre = PeriodeActivite['categorie'];

interface ContexteDeFrise {
  readonly now: Date;
  readonly echelle: EchelleFrise;
  readonly poignee: PoigneeDeFrise | undefined;
}

const POSITION_DU_BORD = 100;
const HAUTEUR_DE_L_AXE_PX = 28;
const HAUTEUR_D_UN_ELEMENT_PX = 44;
const ESPACE_ENTRE_RANGEES_PX = 8;
const ETATS_SANS_FIN_RECUE: readonly ActiviteAnomalie['etat'][] = ['EN_COURS', 'A_RESOUDRE'];

const instantAvecSecondes = new InstantTimeAndLongDayWithSecondsPipe();
const QUALIFICATIFS = LIBELLES_ANOMALIES.frise;

const nomDuRepere = (pointage: PointageAnomalie, enCause: boolean, deplace: boolean, now: Date): string =>
  [
    instantAvecSecondes.transform(pointage.fait.instant, now).time,
    libelleDuGeste(pointage.fait),
    ...(pointage.annulation ? [QUALIFICATIFS.annule] : []),
    ...(pointage.regularisation ? [QUALIFICATIFS.regularise] : []),
    ...(enCause ? [QUALIFICATIFS.enCause] : []),
    ...(deplace ? [QUALIFICATIFS.heureRemplacee] : []),
  ].join(' · ');

const symboleDuGeste = (fait: PointageAnomalie['fait']): string =>
  QUALIFICATIFS.symboles[fait.type][fait.intention] ?? QUALIFICATIFS.symboleInconnu;

const estDeplace = (pointage: PointageAnomalie, poignee: PoigneeDeFrise | undefined): boolean =>
  poignee?.origine === pointage.id.pointage && Date.parse(poignee.instant) !== Date.parse(pointage.fait.instant);

const repereDe = (pointage: PointageAnomalie, enCause: boolean, voie: number, contexte: ContexteDeFrise): RepereFrise => {
  const deplace = estDeplace(pointage, contexte.poignee);
  return {
    kind: 'REPERE',
    instant: Date.parse(pointage.fait.instant),
    gauche: positionSur(contexte.echelle, Date.parse(pointage.fait.instant)),
    haut: HAUTEUR_DE_L_AXE_PX + voie * HAUTEUR_D_UN_ELEMENT_PX,
    voie,
    cle: `pointage:${pointage.id.pointage}`,
    pointage: pointage.id.pointage,
    nom: nomDuRepere(pointage, enCause, deplace, contexte.now),
    selection: { kind: 'POINTAGE', id: pointage.id.pointage },
    heure: heureDe(pointage.fait.instant),
    symbole: symboleDuGeste(pointage.fait),
    nonConformite: pointage.fait.type === 'NON_CONFORMITE',
    annule: pointage.annulation !== undefined,
    regularise: pointage.regularisation,
    enCause,
    deplace,
  };
};

const finRecueDe = (etat: ActiviteAnomalie['etat'], fin: string | undefined): string | undefined =>
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

const barreDe = (activite: ActiviteAnomalie, haut: number, contexte: ContexteDeFrise): BarreFrise =>
  activite.periode === undefined
    ? barreSansPeriode(activite, haut, contexte.now)
    : barreAvecPeriode(activite, activite.periode, haut, contexte);

const debutDe = (activite: ActiviteAnomalie): number => (activite.periode === undefined ? Infinity : Date.parse(activite.periode.debut));

const parDebut = (activites: readonly ActiviteAnomalie[]): readonly ActiviteAnomalie[] =>
  [...activites].sort((premiere, seconde) => debutDe(premiere) - debutDe(seconde));

const hauteurDesReperes = (reperes: readonly RepereFrise[]): number =>
  (Math.max(-1, ...reperes.map(repere => repere.voie)) + 1) * HAUTEUR_D_UN_ELEMENT_PX;

const flechesDe = (
  diagnostics: readonly DiagnosticConflit[],
  reperes: readonly RepereFrise[],
  barres: readonly BarreFrise[],
): readonly FlecheFrise[] =>
  diagnostics.flatMap(diagnostic => {
    const repere = reperes.find(candidat => candidat.pointage === diagnostic.pointage.pointage);
    const barre = barres.find(candidate => candidate.activite === diagnostic.cible.activite.activite && candidate.categorie !== undefined);
    return repere === undefined || barre === undefined
      ? []
      : [
          {
            cle: `${repere.cle}>${barre.cle}`,
            pointage: repere.pointage,
            activite: barre.activite,
            departGauche: repere.gauche,
            departHaut: repere.haut + HAUTEUR_D_UN_ELEMENT_PX,
            arriveeGauche: barre.gauche,
            arriveeHaut: barre.haut,
          },
        ];
  });

const instantsDesActivites = (activites: readonly ActiviteAnomalie[]): readonly number[] =>
  activites
    .flatMap(activite => [activite.periode?.debut, activite.periode?.fin])
    .flatMap(instant => (instant === undefined ? [] : [Date.parse(instant)]))
    .filter(Number.isFinite);

const instantsDeLEchelle = (
  pointages: readonly PointageAnomalie[],
  activites: readonly ActiviteAnomalie[],
  now: Date,
): readonly number[] => {
  const instants = [...pointages.map(pointage => Date.parse(pointage.fait.instant)), ...instantsDesActivites(activites)];
  return instants.length > 0 ? instants : [now.getTime()];
};

const positionDeLaPoignee = (poignee: PoigneeDeFrise, echelle: EchelleFrise, haut: number): PositionDePoignee => ({
  gauche: positionSur(echelle, Date.parse(poignee.instant)),
  haut,
  min: Date.parse(poignee.bornes.min),
  max: Date.parse(poignee.bornes.max),
  valeur: Date.parse(poignee.instant),
  texte: texteDeLHeure(poignee.instant),
  desactivee: poignee.desactivee,
  source: poignee,
});

const estLisible = (pointage: PointageAnomalie): boolean => Number.isFinite(Date.parse(pointage.fait.instant));

export const dispositionDeFrise = (vue: VueDeFrise, now: Date, poignee?: PoigneeDeFrise): DispositionFrise => {
  const enCause = new Set(vue.diagnostics?.map(diagnostic => diagnostic.pointage.pointage));
  const pointages = new ChronologiePointages(vue.journal.filter(estLisible)).pointages;
  const echelle = echelleDe(instantsDeLEchelle(pointages, vue.activites, now), poignee && Date.parse(poignee.bornes.max));
  const contexte = { now, echelle, poignee };
  const reperes = surVoies(pointages, pointage => Date.parse(pointage.fait.instant)).map(({ element, voie }) =>
    repereDe(element, enCause.has(element.id.pointage), voie, contexte),
  );
  const hautDeLaPoignee = HAUTEUR_DE_L_AXE_PX + hauteurDesReperes(reperes);
  const hautDesActivites = hautDeLaPoignee + (poignee === undefined ? 0 : HAUTEUR_D_UN_ELEMENT_PX) + ESPACE_ENTRE_RANGEES_PX;
  const barres = parDebut(vue.activites).map((activite, rang) =>
    barreDe(activite, hautDesActivites + rang * (HAUTEUR_D_UN_ELEMENT_PX + ESPACE_ENTRE_RANGEES_PX), contexte),
  );
  const elements = [...barres, ...reperes].sort((gauche, droite) => gauche.instant - droite.instant);
  return {
    echelle,
    largeurMinimale: largeurMinimaleDe(echelle),
    hauteur:
      Math.max(...elements.map(element => element.haut), ...(poignee === undefined ? [] : [hautDeLaPoignee]))
      + HAUTEUR_D_UN_ELEMENT_PX
      + ESPACE_ENTRE_RANGEES_PX,
    graduations: graduationsDe(echelle),
    fleches: flechesDe(vue.diagnostics ?? [], reperes, barres),
    elements,
    poignee: poignee === undefined ? undefined : positionDeLaPoignee(poignee, echelle, hautDeLaPoignee),
  };
};
