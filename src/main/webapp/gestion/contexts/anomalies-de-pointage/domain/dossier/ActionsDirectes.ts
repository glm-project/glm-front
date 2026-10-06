import { PropositionActe, SaisieActe } from '../acte/SaisieActe';
import { conflitAExpliquer } from './ConflitAExpliquer';
import { ChoixGuide, DiagnosticConflit, DossierAnomalie, PointageAnomalie } from './DossierAnomalie';
import { PointageAnomalieId } from './PointageAnomalieId';

type Sorte = 'ANNULER' | 'CORRIGER_L_HEURE';

export interface ActionDirecte {
  readonly sorte: Sorte;
  readonly pointage: PointageAnomalie;
  readonly saisie: SaisieActe;
}

type Dossier = Pick<DossierAnomalie, 'enConflit' | 'journal' | 'diagnostics' | 'choix'>;

interface Candidat {
  readonly sorte: Sorte;
  readonly pointage: PointageAnomalieId;
}

interface RegleDeSorte {
  readonly acte: Exclude<PropositionActe['kind'], 'REGULARISATION'>;
  readonly saisie: (pointage: PointageAnomalie) => SaisieActe;
}

const REGLES_DE_SORTE: Readonly<Record<Sorte, RegleDeSorte>> = {
  ANNULER: { acte: 'ANNULATION', saisie: pointage => SaisieActe.cancel(pointage.id.pointage) },
  CORRIGER_L_HEURE: { acte: 'CORRECTION', saisie: pointage => SaisieActe.correct(pointage.id.pointage, pointage.fait) },
};

const annuler = (pointage: PointageAnomalieId): Candidat => ({ sorte: 'ANNULER', pointage });

const corrigerLHeure = (pointage: PointageAnomalieId): Candidat => ({ sorte: 'CORRIGER_L_HEURE', pointage });

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
  gauche.sorte === droite.sorte && gauche.pointage.equals(droite.pointage);

const estLaPremiereOccurrence = (candidat: Candidat, rang: number, candidats: readonly Candidat[]): boolean =>
  candidats.findIndex(autre => memeCandidat(autre, candidat)) === rang;

const proposeParLeServeur = (choix: readonly ChoixGuide[], candidat: Candidat): boolean =>
  choix.some(({ saisie }) => {
    const acte = saisie.proposition;
    return acte !== undefined && acte.kind === REGLES_DE_SORTE[candidat.sorte].acte && acte.pointage === candidat.pointage.pointage;
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
        return pointage === undefined
          ? []
          : [{ sorte: candidat.sorte, pointage, saisie: REGLES_DE_SORTE[candidat.sorte].saisie(pointage) }];
      });
    return new ActionsDirectes(actions);
  }
}
