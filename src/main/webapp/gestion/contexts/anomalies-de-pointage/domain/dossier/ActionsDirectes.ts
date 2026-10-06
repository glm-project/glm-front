import { PropositionActe, SaisieActe } from '../acte/SaisieActe';
import { conflitAExpliquer } from './ConflitAExpliquer';
import { ChoixGuide, DiagnosticConflit, DossierAnomalie, PointageAnomalie } from './DossierAnomalie';
import { PointageAnomalieId } from './PointageAnomalieId';

type ActeDirect = Exclude<PropositionActe['kind'], 'REGULARISATION'>;

export interface ActionDirecte {
  readonly pointage: PointageAnomalie;
  readonly saisie: SaisieActe;
}

type Dossier = Pick<DossierAnomalie, 'enConflit' | 'journal' | 'diagnostics' | 'choix'>;

interface Candidat {
  readonly acte: ActeDirect;
  readonly pointage: PointageAnomalieId;
}

const SAISIE_DE_L_ACTE: Readonly<Record<ActeDirect, (pointage: PointageAnomalie) => SaisieActe>> = {
  ANNULATION: pointage => SaisieActe.cancel(pointage.id.pointage),
  CORRECTION: pointage => SaisieActe.correct(pointage.id.pointage, pointage.fait),
};

const annuler = (pointage: PointageAnomalieId): Candidat => ({ acte: 'ANNULATION', pointage });

const corrigerLHeure = (pointage: PointageAnomalieId): Candidat => ({ acte: 'CORRECTION', pointage });

const annulerLeTerminant = (diagnostic: DiagnosticConflit): readonly Candidat[] =>
  diagnostic.cible.termineePar === undefined ? [] : [annuler(diagnostic.cible.termineePar)];

const CANDIDATS_PAR_RAISON: Readonly<Record<DiagnosticConflit['raison'], (diagnostic: DiagnosticConflit) => readonly Candidat[]>> = {
  CIBLE_REMPLACEE: diagnostic => [annuler(diagnostic.pointage)],
  CIBLE_DEJA_TERMINEE: diagnostic => [annuler(diagnostic.pointage), ...annulerLeTerminant(diagnostic)],
  GESTE_AVANT_OUVERTURE: diagnostic => [annuler(diagnostic.pointage), corrigerLHeure(diagnostic.pointage)],
  OUVRANT_ANNULE: diagnostic => [annuler(diagnostic.pointage)],
  TRANSITION_MEME_CATEGORIE: diagnostic => [annuler(diagnostic.pointage)],
  CIBLE_ECHUE_AVEC_AUTRE_ACTIVITE: diagnostic => [annuler(diagnostic.pointage)],
  CONTRADICTION_REGULARISATION: diagnostic => [annuler(diagnostic.pointage)],
};

const memeCandidat = (gauche: Candidat, droite: Candidat): boolean =>
  gauche.acte === droite.acte && gauche.pointage.equals(droite.pointage);

const estLaPremiereOccurrence = (candidat: Candidat, rang: number, candidats: readonly Candidat[]): boolean =>
  candidats.findIndex(autre => memeCandidat(autre, candidat)) === rang;

const proposeParLeServeur = (choix: readonly ChoixGuide[], candidat: Candidat): boolean =>
  choix.some(({ saisie }) => {
    const acte = saisie.proposition;
    return acte !== undefined && acte.kind === candidat.acte && acte.pointage === candidat.pointage.pointage;
  });

const pointageActif = (journal: readonly PointageAnomalie[], identifiant: PointageAnomalieId): PointageAnomalie | undefined =>
  journal.find(pointage => pointage.id.equals(identifiant) && pointage.annulation === undefined);

export class ActionsDirectes {
  private constructor(readonly actions: readonly ActionDirecte[]) {}

  static depuis(dossier: Dossier): ActionsDirectes {
    if (!conflitAExpliquer(dossier)) return new ActionsDirectes([]);
    const actions = (dossier.diagnostics ?? [])
      .flatMap(diagnostic => CANDIDATS_PAR_RAISON[diagnostic.raison](diagnostic))
      .filter(estLaPremiereOccurrence)
      .filter(candidat => !proposeParLeServeur(dossier.choix, candidat))
      .flatMap(candidat => {
        const pointage = pointageActif(dossier.journal, candidat.pointage);
        return pointage === undefined ? [] : [{ pointage, saisie: SAISIE_DE_L_ACTE[candidat.acte](pointage) }];
      });
    return new ActionsDirectes(actions);
  }
}
