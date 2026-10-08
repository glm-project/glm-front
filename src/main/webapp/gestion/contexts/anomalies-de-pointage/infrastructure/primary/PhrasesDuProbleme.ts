import { ActiviteAnomalie, DossierAnomalie, PointageAnomalie } from '../../domain/dossier/DossierAnomalie';
import { finARegulariser } from '../../domain/dossier/FinsARegulariser';
import { PointageAnomalieId } from '../../domain/dossier/PointageAnomalieId';
import { pointagesTardifs } from '../../domain/dossier/PointagesTardifs';
import { LIBELLES_ANOMALIES } from './LibellesAnomalies';
import { defini, gesteDuPointage, heureDe } from './PresentationDossier';

type PeriodeActivite = NonNullable<ActiviteAnomalie['periode']>;
type CategorieActivite = PeriodeActivite['categorie'];
type PeriodeEchue = PeriodeActivite & { readonly fin: string };

const PROBLEMES = LIBELLES_ANOMALIES.problemes;

const majuscule = (texte: string): string => texte.charAt(0).toUpperCase() + texte.slice(1);

const sujetDe = (pointage: PointageAnomalie | undefined): string =>
  pointage === undefined
    ? PROBLEMES.pointageNonResolu
    : majuscule(`${defini(gesteDuPointage(pointage))} de ${heureDe(pointage.fait.instant)}`);

const pointageDu = (journal: readonly PointageAnomalie[], identifiant: PointageAnomalieId): PointageAnomalie | undefined =>
  journal.find(pointage => pointage.id.equals(identifiant));

const activiteDite = (categorie: CategorieActivite) => PROBLEMES.activites[categorie];

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

export const phrasesDuProbleme = (dossier: DossierAnomalie): readonly string[] =>
  dossier.finAutomatique ? phrasesDeFinAutomatique(dossier) : [];
