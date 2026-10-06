import { TypePointage } from '../../domain/acte/ActeResolution';
import { conflitAExpliquer } from '../../domain/dossier/ConflitAExpliquer';
import { ActiviteAnomalie, DiagnosticConflit, DossierAnomalie, PointageAnomalie } from '../../domain/dossier/DossierAnomalie';
import { finARegulariser } from '../../domain/dossier/FinsARegulariser';
import { PointageAnomalieId } from '../../domain/dossier/PointageAnomalieId';
import { pointagesTardifs } from '../../domain/dossier/PointagesTardifs';
import { LIBELLES_ANOMALIES } from './LibellesAnomalies';
import { defini, gesteDuPointage, heureDe, libelleDuGeste, minuscule } from './PresentationDossier';

type PeriodeActivite = NonNullable<ActiviteAnomalie['periode']>;
type CategorieActivite = PeriodeActivite['categorie'];
type PeriodeEchue = PeriodeActivite & { readonly fin: string };

interface Contexte {
  readonly sujet: string;
  readonly enCause: PointageAnomalie | undefined;
  readonly activite: ActiviteAnomalie | undefined;
  readonly ouvrant: PointageAnomalie | undefined;
  readonly termineePar: PointageAnomalie | undefined;
}

const PROBLEMES = LIBELLES_ANOMALIES.problemes;
const CATEGORIE_DU_TYPE: Readonly<Partial<Record<TypePointage, CategorieActivite>>> = {
  DEBUT: 'TRAVAIL',
  NON_CONFORMITE: 'NON_CONFORMITE',
};

const majuscule = (texte: string): string => texte.charAt(0).toUpperCase() + texte.slice(1);
const indefini = (geste: string): string => `un ${minuscule(geste)}`;

const sujetDe = (pointage: PointageAnomalie | undefined): string =>
  pointage === undefined
    ? PROBLEMES.pointageNonResolu
    : majuscule(`${defini(gesteDuPointage(pointage))} de ${heureDe(pointage.fait.instant)}`);

const pointageDu = (journal: readonly PointageAnomalie[], identifiant: PointageAnomalieId | undefined): PointageAnomalie | undefined =>
  identifiant === undefined ? undefined : journal.find(pointage => pointage.id.equals(identifiant));

const debutDe = (contexte: Contexte): string | undefined => {
  const debut = contexte.ouvrant?.fait.instant ?? contexte.activite?.periode?.debut;
  return debut === undefined ? undefined : heureDe(debut);
};

const categorieDe = (contexte: Contexte): CategorieActivite | undefined =>
  contexte.activite?.periode?.categorie ?? (contexte.enCause === undefined ? undefined : CATEGORIE_DU_TYPE[contexte.enCause.fait.type]);

const activiteDite = (categorie: CategorieActivite | undefined) => PROBLEMES.activites[categorie ?? 'INCONNUE'];

const conflit = PROBLEMES.conflit;

const PHRASES_DE_CONFLIT: Readonly<Record<DiagnosticConflit['raison'], (contexte: Contexte) => string>> = {
  CIBLE_REMPLACEE: contexte => {
    const cible = activiteDite(contexte.activite?.periode?.categorie);
    const { termineePar } = contexte;
    return termineePar === undefined
      ? conflit.CIBLE_REMPLACEE.sans(contexte.sujet, cible)
      : conflit.CIBLE_REMPLACEE.avec(contexte.sujet, cible, heureDe(termineePar.fait.instant), indefini(libelleDuGeste(termineePar.fait)));
  },
  CIBLE_DEJA_TERMINEE: contexte => {
    const cible = activiteDite(contexte.activite?.periode?.categorie);
    const { termineePar } = contexte;
    return termineePar === undefined
      ? conflit.CIBLE_DEJA_TERMINEE.sans(contexte.sujet, cible)
      : conflit.CIBLE_DEJA_TERMINEE.avec(contexte.sujet, cible, heureDe(termineePar.fait.instant));
  },
  GESTE_AVANT_OUVERTURE: contexte => {
    const cible = activiteDite(contexte.activite?.periode?.categorie);
    const debut = debutDe(contexte);
    return debut === undefined
      ? conflit.GESTE_AVANT_OUVERTURE.sans(contexte.sujet, cible)
      : conflit.GESTE_AVANT_OUVERTURE.avec(contexte.sujet, cible, debut);
  },
  OUVRANT_ANNULE: contexte => {
    const cible = activiteDite(contexte.activite?.periode?.categorie);
    const { ouvrant } = contexte;
    return ouvrant === undefined
      ? conflit.OUVRANT_ANNULE.sans(contexte.sujet, cible)
      : conflit.OUVRANT_ANNULE.avec(contexte.sujet, cible, `${defini(libelleDuGeste(ouvrant.fait))} de ${heureDe(ouvrant.fait.instant)}`);
  },
  TRANSITION_MEME_CATEGORIE: contexte => {
    const categorie = categorieDe(contexte);
    const cible = activiteDite(categorie);
    const etat = categorie === undefined ? PROBLEMES.memeCategorie : PROBLEMES.categories[categorie];
    const debut = debutDe(contexte);
    return debut === undefined
      ? conflit.TRANSITION_MEME_CATEGORIE.sans(contexte.sujet, cible, etat)
      : conflit.TRANSITION_MEME_CATEGORIE.avec(contexte.sujet, cible, debut, etat);
  },
  CIBLE_ECHUE_AVEC_AUTRE_ACTIVITE: contexte => {
    const cible = activiteDite(contexte.activite?.periode?.categorie);
    const debut = contexte.activite?.periode?.debut;
    return debut === undefined
      ? conflit.CIBLE_ECHUE_AVEC_AUTRE_ACTIVITE.sans(contexte.sujet, cible)
      : conflit.CIBLE_ECHUE_AVEC_AUTRE_ACTIVITE.avec(contexte.sujet, cible, heureDe(debut));
  },
  CONTRADICTION_REGULARISATION: contexte => {
    const cible = activiteDite(contexte.activite?.periode?.categorie);
    const { termineePar } = contexte;
    return termineePar === undefined
      ? conflit.CONTRADICTION_REGULARISATION.sans(contexte.sujet, cible)
      : conflit.CONTRADICTION_REGULARISATION.avec(contexte.sujet, cible, heureDe(termineePar.fait.instant));
  },
};

const phraseDeConflit = (dossier: DossierAnomalie, diagnostic: DiagnosticConflit): string => {
  const enCause = pointageDu(dossier.journal, diagnostic.pointage);
  return PHRASES_DE_CONFLIT[diagnostic.raison]({
    sujet: sujetDe(enCause),
    enCause,
    activite: dossier.activites.find(activite => activite.id.activite === diagnostic.cible.activite.activite),
    ouvrant: pointageDu(dossier.journal, diagnostic.cible.ouvrant),
    termineePar: pointageDu(dossier.journal, diagnostic.cible.termineePar),
  });
};

const phrasesDeConflit = (dossier: DossierAnomalie): readonly string[] =>
  dossier.diagnostics?.length ? dossier.diagnostics.map(diagnostic => phraseDeConflit(dossier, diagnostic)) : [dossier.ligne.explication];

const pointageTardifDe = (dossier: DossierAnomalie, activite: ActiviteAnomalie): PointageAnomalieId | undefined => {
  const tardif = pointagesTardifs(dossier.choix).find(candidat => candidat.activite === activite.id.activite);
  return tardif === undefined ? undefined : new PointageAnomalieId(tardif.pointage);
};

const phraseSansPointageTardif = (dossier: DossierAnomalie, activite: ActiviteAnomalie, periode: PeriodeEchue): string => {
  const cible = activiteDite(periode.categorie);
  const modele = finARegulariser(dossier.choix, activite.id.activite)
    ? PROBLEMES.finAutomatique.sansFin
    : PROBLEMES.finAutomatique.terminee;
  return majuscule(modele(cible, heureDe(periode.debut), heureDe(periode.fin)));
};

const phraseDeFinAutomatique = (dossier: DossierAnomalie, activite: ActiviteAnomalie, periode: PeriodeEchue): string => {
  const tardif = pointageTardifDe(dossier, activite);
  return tardif === undefined
    ? phraseSansPointageTardif(dossier, activite, periode)
    : PROBLEMES.finAutomatique.pointageTardif(
        sujetDe(pointageDu(dossier.journal, tardif)),
        activiteDite(periode.categorie),
        heureDe(periode.fin),
      );
};

const phrasesDeFinAutomatique = (dossier: DossierAnomalie): readonly string[] =>
  dossier.activites.flatMap(activite => {
    const periode = activite.periode;
    return activite.etat === 'ECHUE' && periode?.fin !== undefined
      ? [phraseDeFinAutomatique(dossier, activite, { ...periode, fin: periode.fin })]
      : [];
  });

export const phrasesDuProbleme = (dossier: DossierAnomalie): readonly string[] => [
  ...(dossier.finAutomatique ? phrasesDeFinAutomatique(dossier) : []),
  ...(conflitAExpliquer(dossier) ? phrasesDeConflit(dossier) : []),
];
