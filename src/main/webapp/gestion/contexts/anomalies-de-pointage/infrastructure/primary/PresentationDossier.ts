import { formatInstantTime } from '@/app/shared/date-format/infrastructure/primary/DateFormats';
import { InstantLongDayPipe, InstantLongDayWithSecondsPipe } from '@/app/shared/date-format/infrastructure/primary/InstantPipes';
import { SaisieFait } from '../../domain/acte/SaisieActe';
import { ChronologiePointages } from '../../domain/dossier/ChronologiePointages';
import { ActiviteAnomalie, DossierAnomalie, PointageAnomalie } from '../../domain/dossier/DossierAnomalie';
import { LIBELLES_ANOMALIES } from './LibellesAnomalies';
import { operateurPresente } from './PresentationIdentites';
import { SelectionDuDossier } from './SelectionDuDossier';

export type VueDActivites = Readonly<{ journal: readonly PointageAnomalie[]; activites?: readonly ActiviteAnomalie[] }>;

export interface DetailPointage {
  readonly entete: string;
  readonly geste: string;
  readonly cible?: string;
  readonly creee?: string;
}

type CategorieActivite = NonNullable<ActiviteAnomalie['periode']>['categorie'];

export type ReferencePointage = Readonly<{ libelle: string; pointage?: PointageAnomalie }>;

const instantLongDay = new InstantLongDayPipe();
const instantLongDayWithSeconds = new InstantLongDayWithSecondsPipe();

export const heureDe = (instant: string): string => {
  const date = new Date(instant);
  return Number.isNaN(date.getTime()) ? instant : formatInstantTime(date);
};

export const libelleDuGeste = (fait: Pick<SaisieFait, 'type' | 'intention'>): string => {
  const geste = fait.type === '' || fait.intention === '' ? undefined : LIBELLES_ANOMALIES.gestes[fait.type][fait.intention];
  if (geste !== undefined) return geste;
  const type = fait.type === '' ? [] : [LIBELLES_ANOMALIES.types[fait.type]];
  const intention = fait.intention === '' ? [] : [LIBELLES_ANOMALIES.intentions[fait.intention]];
  return [...type, ...intention].join(' · ');
};

export const minuscule = (texte: string): string => texte.charAt(0).toLowerCase() + texte.slice(1);

export const defini = (geste: string): string => (/^[aeiou]/i.test(geste) ? `l’${minuscule(geste)}` : `le ${minuscule(geste)}`);

export const gesteDuPointage = (pointage: PointageAnomalie): string =>
  pointage.regularisation ? `${libelleDuGeste(pointage.fait)} ${LIBELLES_ANOMALIES.problemes.regularise}` : libelleDuGeste(pointage.fait);

export const libelleCategorie = (categorie: CategorieActivite): string =>
  categorie === 'TRAVAIL' ? LIBELLES_ANOMALIES.types.DEBUT : LIBELLES_ANOMALIES.types.NON_CONFORMITE;

export const intituleDeLActivite = (activite: ActiviteAnomalie): string =>
  activite.periode === undefined ? activite.libelle : libelleCategorie(activite.periode.categorie);

export const libelleActivite = (activite: ActiviteAnomalie, now: Date): string => {
  const periode = activite.periode;
  if (periode === undefined) return activite.libelle;
  const categorie = libelleCategorie(periode.categorie);
  const fin = periode.fin === undefined ? '' : ` → ${instantLongDay.transform(periode.fin, now)}`;
  return `${categorie} · ${instantLongDay.transform(periode.debut, now)}${fin}`;
};

export const labelForActivite = (id: string, vue: VueDActivites, now: Date): string => {
  const activite = vue.activites?.find(activite => activite.id.activite === id);
  if (activite !== undefined) return libelleActivite(activite, now);
  const origine = vue.journal.find(pointage => pointage.activiteCreee?.activite === id);
  if (origine !== undefined) return `${libelleDuGeste(origine.fait)} · ${instantLongDayWithSeconds.transform(origine.fait.instant, now)}`;
  return LIBELLES_ANOMALIES.activiteNonResolue;
};

export const referencePointage = (journal: readonly PointageAnomalie[], identifiant: string, now: Date): ReferencePointage => {
  const pointage = journal.find(pointage => pointage.id.pointage === identifiant);
  if (pointage === undefined) return { libelle: LIBELLES_ANOMALIES.pointageNonResolu };
  const fait = pointage.fait;
  return {
    libelle: `${instantLongDayWithSeconds.transform(fait.instant, now)} · ${libelleDuGeste(fait)}`,
    pointage,
  };
};

export const remplacementDe = (journal: readonly PointageAnomalie[], identifiant: string, now: Date): string => {
  const reference = referencePointage(journal, identifiant, now);
  return reference.pointage === undefined ? LIBELLES_ANOMALIES.remplaceNonResolu : `${LIBELLES_ANOMALIES.remplace} ${reference.libelle}`;
};

export const detailDuPointage = (pointage: PointageAnomalie, vue: VueDActivites, now: Date): DetailPointage => {
  const fait = pointage.fait;
  return {
    entete: `${operateurPresente(pointage.operateurNom)} · ${instantLongDayWithSeconds.transform(fait.instant, now)}`,
    geste: libelleDuGeste(fait),
    ...(fait.activiteVisee ? { cible: labelForActivite(fait.activiteVisee, vue, now) } : {}),
    ...(pointage.activiteCreee ? { creee: labelForActivite(pointage.activiteCreee.activite, vue, now) } : {}),
  };
};

export const tempsActivite = (activite: ActiviteAnomalie): string => {
  if (activite.etat === 'EN_COURS') return 'Temps non définitif';
  if (activite.etat === 'A_RESOUDRE') return activite.temps || 'Temps à résoudre';
  const duree = activite.periode?.duree;
  if (duree === undefined) return activite.temps;
  const composants = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/.exec(duree);
  if (composants === null) return duree;
  return [
    composants[1] && `${composants[1]} h`,
    composants[2] && `${composants[2]} min`,
    composants[3] && `${composants[3].replace('.', ',')} s`,
  ]
    .filter(Boolean)
    .join(' ');
};

const premierPointageEnCause = (dossier: DossierAnomalie): string | undefined => {
  const enCause = new Set(dossier.diagnostics?.map(diagnostic => diagnostic.pointage.pointage));
  return new ChronologiePointages(dossier.journal).pointages.find(pointage => enCause.has(pointage.id.pointage))?.id.pointage;
};

const activiteEchueDUneFinAutomatique = (dossier: DossierAnomalie): string | undefined =>
  dossier.finAutomatique ? dossier.activites.find(activite => activite.etat === 'ECHUE')?.id.activite : undefined;

export const selectionInitiale = (dossier: DossierAnomalie | undefined): SelectionDuDossier | undefined => {
  if (dossier === undefined) return undefined;
  const pointage = premierPointageEnCause(dossier);
  if (pointage !== undefined) return { kind: 'POINTAGE', id: pointage };
  const activite = activiteEchueDUneFinAutomatique(dossier);
  return activite === undefined ? undefined : { kind: 'ACTIVITE', id: activite };
};
