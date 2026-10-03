import { ActeResolution, FaitPropose, IntentionPointage, TypePointage } from './ActeResolution';
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

  command(): ActeResolution | undefined {
    const proposition = this.proposition;
    if (proposition === undefined) return undefined;
    if (proposition.kind === 'ANNULATION') return this.errors().length > 0 ? undefined : proposition;
    const fait = proposition.fait;
    if (fait.type === '') return undefined;
    if (fait.intention === '') return undefined;
    if (this.errors().length > 0) return undefined;
    return { ...proposition, fait: { ...fait, type: fait.type, intention: fait.intention } };
  }

  matches(acte: ActeResolution): boolean {
    const command = this.command();
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

  errors(): readonly ErreurSaisieActe[] {
    const proposition = this.proposition;
    if (proposition === undefined) return ['ACTE_REQUIS'];
    if (proposition.kind === 'ANNULATION') return new MotifActe(proposition.motif).errors();
    const erreurs = this.factErrors(proposition.fait);
    if (proposition.kind === 'CORRECTION') erreurs.push(...new MotifActe(proposition.motif).errors());
    return erreurs;
  }

  private factErrors(fait: SaisieFait): ErreurSaisieActe[] {
    const erreurs: ErreurSaisieActe[] = [];
    if (fait.type === '') erreurs.push('TYPE_REQUIS');
    if (fait.intention === '') erreurs.push('INTENTION_REQUISE');
    if (fait.operateur.trim() === '') erreurs.push('OPERATEUR_REQUIS');
    if (this.targetIsMissing(fait)) erreurs.push('CIBLE_REQUISE');
    if (this.targetIsForbidden(fait)) erreurs.push('CIBLE_INTERDITE');
    if (!this.intentionIsCompatible(fait)) erreurs.push('INTENTION_INCOMPATIBLE');
    if (!new InstantPointage(fait.instant).isValid()) erreurs.push('INSTANT_INVALIDE');
    return erreurs;
  }

  private targetIsMissing(fait: SaisieFait): boolean {
    return (fait.intention === 'FIN' || fait.intention === 'TRANSITION') && fait.activiteVisee.trim() === '';
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
    return fait.intention === 'OUVERTURE' && fait.activiteVisee.trim() !== '';
  }

  private intentionIsCompatible(fait: SaisieFait): boolean {
    return (fait.type === 'FIN') === (fait.intention === 'FIN');
  }
}
