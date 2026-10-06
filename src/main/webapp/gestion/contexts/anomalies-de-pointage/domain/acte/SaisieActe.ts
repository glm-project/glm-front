import { ActeResolution, FaitPropose, IntentionPointage, TypePointage, combinaisonEstValide } from './ActeResolution';
import { CadreDuFait } from './CadreDuFait';
import { InstantPointage } from './InstantPointage';
import { MotifActe } from './MotifActe';

export type PropositionActe =
  | { readonly kind: 'ANNULATION'; readonly pointage: string; readonly motif: string }
  | { readonly kind: 'CORRECTION'; readonly pointage: string; readonly motif: string; readonly fait: SaisieFait }
  | { readonly kind: 'REGULARISATION'; readonly fait: SaisieFait };

export interface SaisieFait {
  readonly type: TypePointage | '';
  readonly intention: IntentionPointage | '';
  readonly activiteVisee: string;
  readonly operateur: string;
  readonly poste: string;
  readonly instant: string;
}

export const termineUneActivite = (fait: Pick<SaisieFait, 'intention'>): boolean =>
  fait.intention === 'FIN' || fait.intention === 'TRANSITION';

export interface ChangementSaisie {
  readonly motif?: string;
  readonly fait?: Partial<SaisieFait>;
}

export type ErreurSaisieActe =
  | 'ACTE_REQUIS'
  | 'MOTIF_REQUIS'
  | 'MOTIF_INVALIDE'
  | 'OPERATEUR_REQUIS'
  | 'CIBLE_REQUISE'
  | 'CIBLE_INTERDITE'
  | 'INTENTION_INCOMPATIBLE'
  | 'INSTANT_INVALIDE'
  | 'INSTANT_AVANT_CIBLE'
  | 'INSTANT_FUTUR'
  | 'TYPE_REQUIS'
  | 'INTENTION_REQUISE';

export class SaisieActe {
  static regularise(fait: SaisieFait = { type: '', intention: '', activiteVisee: '', operateur: '', poste: '', instant: '' }): SaisieActe {
    return new SaisieActe({ kind: 'REGULARISATION', fait: { ...fait } });
  }
  private constructor(readonly proposition?: PropositionActe) {}

  static empty(): SaisieActe {
    return new SaisieActe();
  }

  static cancel(pointage: string): SaisieActe {
    return new SaisieActe({ kind: 'ANNULATION', pointage, motif: '' });
  }

  static correct(pointage: string, fait: FaitPropose): SaisieActe {
    return new SaisieActe({ kind: 'CORRECTION', pointage, motif: '', fait: { ...fait } });
  }

  afterChange(changement: ChangementSaisie): SaisieActe {
    const proposition = this.proposition;
    if (proposition === undefined) return this;
    if (proposition.kind === 'ANNULATION') {
      return new SaisieActe({ ...proposition, motif: changement.motif ?? proposition.motif });
    }
    const fait = { ...proposition.fait, ...changement.fait };
    if (proposition.kind === 'REGULARISATION') {
      return new SaisieActe({ kind: 'REGULARISATION', fait });
    }
    return new SaisieActe({ ...proposition, fait, motif: changement.motif ?? proposition.motif });
  }

  awaitsDating(): boolean {
    return this.proposition?.kind === 'REGULARISATION';
  }

  operateurManque(): boolean {
    const fait = this.fait();
    return fait !== undefined && this.operatorIsMissing(fait);
  }

  cibleApplicable(): boolean {
    const fait = this.fait();
    return fait !== undefined && (termineUneActivite(fait) || fait.activiteVisee !== '');
  }

  changesGuidedFact(changement: ChangementSaisie): boolean {
    if (changement.fait === undefined) return false;
    const champs = Object.keys(changement.fait);
    return !(this.awaitsDating() && champs.length === 1 && champs[0] === 'instant');
  }

  command(cadre: CadreDuFait): ActeResolution | undefined {
    return this.commandWithin(cadre);
  }

  private commandWithin(cadre?: CadreDuFait): ActeResolution | undefined {
    const proposition = this.proposition;
    if (proposition === undefined) return undefined;
    if (proposition.kind === 'ANNULATION') return this.errorsWithin(cadre).length > 0 ? undefined : proposition;
    const fait = proposition.fait;
    if (fait.type === '') return undefined;
    if (fait.intention === '') return undefined;
    if (this.errorsWithin(cadre).length > 0) return undefined;
    return { ...proposition, fait: { ...fait, type: fait.type, intention: fait.intention } };
  }

  matches(acte: ActeResolution): boolean {
    const command = this.commandWithin();
    if (command === undefined) return false;
    switch (command.kind) {
      case 'ANNULATION':
        return acte.kind === 'ANNULATION' && command.pointage === acte.pointage && command.motif === acte.motif;
      case 'CORRECTION':
        return (
          acte.kind === 'CORRECTION'
          && command.pointage === acte.pointage
          && command.motif === acte.motif
          && this.sameFact(command.fait, acte.fait)
        );
      case 'REGULARISATION':
        return acte.kind === 'REGULARISATION' && this.sameFact(command.fait, acte.fait);
    }
  }

  errors(cadre: CadreDuFait): readonly ErreurSaisieActe[] {
    return this.errorsWithin(cadre);
  }

  private errorsWithin(cadre?: CadreDuFait): readonly ErreurSaisieActe[] {
    const proposition = this.proposition;
    if (proposition === undefined) return ['ACTE_REQUIS'];
    if (proposition.kind === 'ANNULATION') return new MotifActe(proposition.motif).errors();
    const erreurs = this.factErrors(proposition.fait, cadre);
    if (proposition.kind === 'CORRECTION') erreurs.push(...new MotifActe(proposition.motif).errors());
    return erreurs;
  }

  private factErrors(fait: SaisieFait, cadre?: CadreDuFait): ErreurSaisieActe[] {
    const erreurs: ErreurSaisieActe[] = [];
    if (fait.type === '') erreurs.push('TYPE_REQUIS');
    if (fait.intention === '') erreurs.push('INTENTION_REQUISE');
    if (this.operatorIsMissing(fait)) erreurs.push('OPERATEUR_REQUIS');
    if (this.targetIsMissing(fait)) erreurs.push('CIBLE_REQUISE');
    if (this.targetIsForbidden(fait)) erreurs.push('CIBLE_INTERDITE');
    if (!this.intentionIsCompatible(fait)) erreurs.push('INTENTION_INCOMPATIBLE');
    erreurs.push(...this.instantErrors(fait, cadre));
    return erreurs;
  }

  private instantErrors(fait: SaisieFait, cadre?: CadreDuFait): readonly ErreurSaisieActe[] {
    if (!new InstantPointage(fait.instant).isValid()) return ['INSTANT_INVALIDE'];
    return cadre?.depassements(fait) ?? [];
  }

  private fait(): SaisieFait | undefined {
    const proposition = this.proposition;
    return proposition === undefined || proposition.kind === 'ANNULATION' ? undefined : proposition.fait;
  }

  private operatorIsMissing(fait: SaisieFait): boolean {
    return fait.operateur.trim() === '';
  }

  private targetIsMissing(fait: SaisieFait): boolean {
    return termineUneActivite(fait) && fait.activiteVisee.trim() === '';
  }

  private sameFact(left: FaitPropose, right: FaitPropose): boolean {
    return (
      left.type === right.type
      && left.intention === right.intention
      && left.activiteVisee === right.activiteVisee
      && left.operateur === right.operateur
      && left.poste === right.poste
      && left.instant === right.instant
    );
  }

  private targetIsForbidden(fait: SaisieFait): boolean {
    return fait.intention === 'OUVERTURE' && fait.activiteVisee !== '';
  }

  private intentionIsCompatible(fait: SaisieFait): boolean {
    return fait.type === '' || fait.intention === '' || combinaisonEstValide(fait);
  }
}
