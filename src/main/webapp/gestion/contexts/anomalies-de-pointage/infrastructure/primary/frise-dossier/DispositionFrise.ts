import { InstantTimeAndLongDayWithSecondsPipe } from '@/app/shared/date-format/infrastructure/primary/InstantPipes';
import { ActiviteAnomalie, DiagnosticConflit, DossierAnomalie, PointageAnomalie } from '../../../domain/dossier/DossierAnomalie';
import { identifiantsDesPointagesTardifs } from '../../../domain/dossier/PointagesTardifs';
import { LIBELLES_ANOMALIES } from '../LibellesAnomalies';
import { heureDe, libelleActivite, libelleCategorie, libelleDuGeste, tempsActivite } from '../PresentationDossier';
import { SelectionDuDossier } from '../SelectionDuDossier';
import { activitesModifiees, faitsDeLActe } from './ComparaisonDApercu';
import {
  echelleDe,
  EchelleFrise,
  Graduation,
  graduationsDe,
  instantsRecus,
  LARGEUR_MINIMALE_PAR_HEURE_PX,
  largeurMinimaleDe,
  positionSur,
  surVoies,
} from './EchelleFrise';
import { PlacementDeLInstant, PoigneeDeFrise, texteDeLHeure } from './PoigneeDeFrise';
import { pointagesDeLaFrise } from './PointagesDeLaFrise';

export type VueDeFrise = Pick<DossierAnomalie, 'journal' | 'activites' | 'diagnostics'> & { readonly choix?: DossierAnomalie['choix'] };

export interface ApercuDeFrise {
  readonly avant: VueDeFrise;
  readonly apres: VueDeFrise;
}

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
  readonly tardif: boolean;
  readonly faitDeLActe: boolean;
}

export type ElementFrise = BarreFrise | RepereFrise | PositionDePoignee;

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
  readonly kind: 'POIGNEE';
  readonly cle: string;
  readonly instant: number;
  readonly gauche: number;
  readonly haut: number;
  readonly min: number;
  readonly max: number;
  readonly valeur: number;
  readonly texte: string;
  readonly desactivee: boolean;
  readonly source: PoigneeDeFrise;
}

export interface RangeeDePlacement {
  readonly haut: number;
  readonly hauteur: number;
  readonly desactivee: boolean;
  readonly source: PlacementDeLInstant;
}

export interface IntituleDeRangee {
  readonly haut: number;
  readonly hauteur: number;
}

export interface DispositionFrise {
  readonly echelle: EchelleFrise;
  readonly largeurMinimale: number;
  readonly hauteur: number;
  readonly graduations: readonly Graduation[];
  readonly intituleDesPointages: IntituleDeRangee | undefined;
  readonly fleches: readonly FlecheFrise[];
  readonly elements: readonly ElementFrise[];
  readonly rangeeDePlacement: RangeeDePlacement | undefined;
  readonly apres: DispositionApres | undefined;
}

export type BarreApres = BarreFrise & { readonly modifiee: boolean };

export interface DispositionApres {
  readonly haut: number;
  readonly hauteur: number;
  readonly reperes: readonly RepereFrise[];
  readonly barres: readonly BarreApres[];
}

type PeriodeActivite = NonNullable<ActiviteAnomalie['periode']>;
type CategorieDeBarre = PeriodeActivite['categorie'];

interface ContexteDeFrise {
  readonly now: Date;
  readonly tardifs: ReadonlySet<string>;
  readonly faitsDeLActe: ReadonlySet<string>;
  readonly echelle: EchelleFrise;
  readonly poignee: PoigneeDeFrise | undefined;
  readonly hautDesReperes: number;
}

const POSITION_DU_BORD = 100;
const HAUTEUR_DE_L_AXE_PX = 28;
const HAUTEUR_DU_TITRE_PX = 28;
const HAUTEUR_DE_L_INTITULE_PX = 20;
const HAUTEUR_D_UN_ELEMENT_PX = 44;
const ESPACE_ENTRE_RANGEES_PX = 8;
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

const repereDe = (pointage: PointageAnomalie, enCause: boolean, voie: number, contexte: ContexteDeFrise): RepereFrise => {
  const deplace = estDeplace(pointage, contexte.poignee);
  const tardif = contexte.tardifs.has(pointage.id.pointage);
  const faitDeLActe = contexte.faitsDeLActe.has(pointage.id.pointage);
  return {
    kind: 'REPERE',
    instant: Date.parse(pointage.fait.instant),
    gauche: positionSur(contexte.echelle, Date.parse(pointage.fait.instant)),
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

const instantTenuSur = (poignee: PoigneeDeFrise, echelle: EchelleFrise): number =>
  Math.min(
    Math.max(Date.parse(poignee.instant), Date.parse(poignee.bornes.min), echelle.debut),
    Date.parse(poignee.bornes.max),
    echelle.fin,
  );

const positionDeLaPoignee = (poignee: PoigneeDeFrise, echelle: EchelleFrise, haut: number): PositionDePoignee => ({
  kind: 'POIGNEE',
  cle: 'poignee',
  instant: instantTenuSur(poignee, echelle),
  gauche: positionSur(echelle, instantTenuSur(poignee, echelle)),
  haut,
  min: Date.parse(poignee.bornes.min),
  max: Date.parse(poignee.bornes.max),
  valeur: instantTenuSur(poignee, echelle),
  texte: texteDeLHeure(poignee.instant),
  desactivee: poignee.desactivee,
  source: poignee,
});

const intituleDesPointages = (pointages: readonly PointageAnomalie[]): IntituleDeRangee | undefined =>
  pointages.length === 0 ? undefined : { haut: HAUTEUR_DE_L_AXE_PX, hauteur: HAUTEUR_DE_L_INTITULE_PX };

const hautDesReperesSous = (intitule: IntituleDeRangee | undefined): number => HAUTEUR_DE_L_AXE_PX + (intitule?.hauteur ?? 0);

const rangeeDePlacement = (placement: PlacementDeLInstant, reperes: readonly RepereFrise[], hautDesReperes: number): RangeeDePlacement => ({
  haut: hautDesReperes,
  hauteur: hauteurDesReperes(reperes),
  desactivee: placement.desactivee,
  source: placement,
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

const dispositionApres = (
  apercu: ApercuDeFrise,
  pointages: readonly PointageAnomalie[],
  haut: number,
  contexte: ContexteDeFrise,
): DispositionApres => {
  const modifiees = activitesModifiees(apercu.avant.activites, apercu.apres.activites);
  const poses = faitsDeLActe(apercu.avant.journal, apercu.apres.journal);
  const reperes = surVoies(pointages, pointage => Date.parse(pointage.fait.instant), LARGEUR_MINIMALE_PAR_HEURE_PX).map(
    ({ element, voie }) => ({
      ...repereDe(element, false, voie, { ...contexte, poignee: undefined, tardifs: new Set(), faitsDeLActe: poses }),
      haut: HAUTEUR_DU_TITRE_PX + voie * HAUTEUR_D_UN_ELEMENT_PX,
    }),
  );
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

const hauteurDeLaFrise = (
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

export const dispositionDeFrise = (
  vue: VueDeFrise,
  now: Date,
  poignee?: PoigneeDeFrise,
  placement?: PlacementDeLInstant,
  apercu?: ApercuDeFrise,
): DispositionFrise => {
  const enCause = new Set(vue.diagnostics?.map(diagnostic => diagnostic.pointage.pointage));
  const pointages = pointagesDeLaFrise(vue);
  const pointagesApres = apercu === undefined ? [] : pointagesDeLaFrise(apercu.apres);
  const echelle = echelleDeLaFrise(
    instantsDeLEchelle([...pointages, ...pointagesApres], [...vue.activites, ...(apercu?.apres.activites ?? [])], now),
    poignee,
    placement,
  );
  const tardifs = identifiantsDesPointagesTardifs(vue.choix ?? []);
  const intitule = intituleDesPointages(pointages);
  const hautDesReperes = hautDesReperesSous(intitule);
  const contexte = { now, echelle, poignee, tardifs, faitsDeLActe: new Set<string>(), hautDesReperes };
  const reperes = surVoies(pointages, pointage => Date.parse(pointage.fait.instant), LARGEUR_MINIMALE_PAR_HEURE_PX).map(
    ({ element, voie }) => repereDe(element, enCause.has(element.id.pointage), voie, contexte),
  );
  const hautDeLaPoignee = hautDesReperes + hauteurDesReperes(reperes);
  const hautDesActivites = hautDeLaPoignee + (poignee === undefined ? 0 : HAUTEUR_D_UN_ELEMENT_PX) + ESPACE_ENTRE_RANGEES_PX;
  const barres = parDebut(vue.activites).map((activite, rang) =>
    barreDe(activite, hautDesActivites + rang * (HAUTEUR_D_UN_ELEMENT_PX + ESPACE_ENTRE_RANGEES_PX), contexte),
  );
  const positionDePoignee = poignee === undefined ? [] : [positionDeLaPoignee(poignee, echelle, hautDeLaPoignee)];
  const elements = [...barres, ...reperes, ...positionDePoignee].sort((gauche, droite) => gauche.instant - droite.instant);
  const apres =
    apercu === undefined
      ? undefined
      : dispositionApres(
          apercu,
          pointagesApres,
          hautDesActivites + barres.length * (HAUTEUR_D_UN_ELEMENT_PX + ESPACE_ENTRE_RANGEES_PX),
          contexte,
        );
  return {
    echelle,
    largeurMinimale: largeurMinimaleDe(echelle),
    hauteur: hauteurDeLaFrise(elements, poignee === undefined ? undefined : hautDeLaPoignee, apres),
    graduations: graduationsDe(echelle),
    intituleDesPointages: intitule,
    fleches: flechesDe(vue.diagnostics ?? [], reperes, barres),
    elements,
    rangeeDePlacement: placement === undefined ? undefined : rangeeDePlacement(placement, reperes, hautDesReperes),
    apres,
  };
};
