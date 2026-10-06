import { SaisieActe } from '../acte/SaisieActe';
import { ActionsDirectes } from './ActionsDirectes';
import { ActiviteAnomalieId } from './ActiviteAnomalieId';
import { ChoixGuide, DiagnosticConflit, DossierAnomalie, PointageAnomalie } from './DossierAnomalie';
import { PointageAnomalieId } from './PointageAnomalieId';

type Dossier = Pick<DossierAnomalie, 'enConflit' | 'journal' | 'diagnostics' | 'choix'>;

describe('Direct actions on the pointages at fault', () => {
  it('should offer to cancel the pointage at fault', () => {
    const dossier = unConflit({ journal: [unArret('fin-17')], diagnostics: [unDiagnostic('CIBLE_REMPLACEE', 'fin-17')] });

    const actions = ActionsDirectes.depuis(dossier).actions;

    expect(actions.map(action => [action.saisie.acte(), action.pointage.id.pointage])).toEqual([['ANNULATION', 'fin-17']]);
  });

  it('should carry the cancellation of the pointage at fault as its input, without a reason yet', () => {
    const dossier = unConflit({ journal: [unArret('fin-17')], diagnostics: [unDiagnostic('CIBLE_REMPLACEE', 'fin-17')] });

    const action = unique(ActionsDirectes.depuis(dossier).actions);

    expect(action.saisie.proposition).toEqual({ kind: 'ANNULATION', pointage: 'fin-17', motif: '' });
  });

  it('should offer nothing for a pointage the journal does not hold', () => {
    const dossier = unConflit({ journal: [], diagnostics: [unDiagnostic('CIBLE_REMPLACEE', 'fin-17')] });

    expect(ActionsDirectes.depuis(dossier).actions).toEqual([]);
  });

  it('should offer nothing for a pointage already cancelled', () => {
    const dossier = unConflit({ journal: [unAnnule(unArret('fin-17'))], diagnostics: [unDiagnostic('CIBLE_REMPLACEE', 'fin-17')] });

    expect(ActionsDirectes.depuis(dossier).actions).toEqual([]);
  });

  it('should also offer to cancel the terminating pointage of an activity already stopped, after the pointage at fault', () => {
    const dossier = unConflit({
      journal: [unArret('fin-17'), unArret('fin-12')],
      diagnostics: [unDiagnostic('CIBLE_DEJA_TERMINEE', 'fin-17', { termineePar: 'fin-12' })],
    });

    const actions = ActionsDirectes.depuis(dossier).actions;

    expect(actions.map(action => [action.saisie.acte(), action.pointage.id.pointage])).toEqual([
      ['ANNULATION', 'fin-17'],
      ['ANNULATION', 'fin-12'],
    ]);
  });

  it('should not offer to cancel a terminating pointage the journal does not hold', () => {
    const dossier = unConflit({
      journal: [unArret('fin-17')],
      diagnostics: [unDiagnostic('CIBLE_DEJA_TERMINEE', 'fin-17', { termineePar: 'fin-12' })],
    });

    const actions = ActionsDirectes.depuis(dossier).actions;

    expect(actions.map(action => action.pointage.id.pointage)).toEqual(['fin-17']);
  });

  it('should not offer to cancel a terminating pointage already cancelled', () => {
    const dossier = unConflit({
      journal: [unArret('fin-17'), unAnnule(unArret('fin-12'))],
      diagnostics: [unDiagnostic('CIBLE_DEJA_TERMINEE', 'fin-17', { termineePar: 'fin-12' })],
    });

    const actions = ActionsDirectes.depuis(dossier).actions;

    expect(actions.map(action => action.pointage.id.pointage)).toEqual(['fin-17']);
  });

  it.each([
    'CIBLE_REMPLACEE',
    'GESTE_AVANT_OUVERTURE',
    'OUVRANT_ANNULE',
    'TRANSITION_MEME_CATEGORIE',
    'CIBLE_ECHUE_AVEC_AUTRE_ACTIVITE',
    'CONTRADICTION_REGULARISATION',
  ] as const)('should offer to cancel the pointage at fault of %s, never the opening or the pointage it cites', raison => {
    const dossier = unConflit({
      journal: [unArret('fin-17'), unArret('debut-8'), unArret('fin-12')],
      diagnostics: [unDiagnostic(raison, 'fin-17', { ouvrant: 'debut-8', termineePar: 'fin-12' })],
    });

    const actions = ActionsDirectes.depuis(dossier).actions;

    expect(actions.filter(action => action.saisie.acte() === 'ANNULATION').map(action => action.pointage.id.pointage)).toEqual(['fin-17']);
  });

  it.each([
    'CIBLE_REMPLACEE',
    'CIBLE_DEJA_TERMINEE',
    'OUVRANT_ANNULE',
    'TRANSITION_MEME_CATEGORIE',
    'CIBLE_ECHUE_AVEC_AUTRE_ACTIVITE',
    'CONTRADICTION_REGULARISATION',
  ] as const)('should offer no time correction for %s', raison => {
    const dossier = unConflit({ journal: [unArret('fin-17')], diagnostics: [unDiagnostic(raison, 'fin-17')] });

    const actions = ActionsDirectes.depuis(dossier).actions;

    expect(actions.map(action => action.saisie.acte())).toEqual(['ANNULATION']);
  });

  it('should offer to correct the time of a pointage made before the opening of its activity, after cancelling it', () => {
    const arret = unArret('fin-7');
    const dossier = unConflit({ journal: [arret], diagnostics: [unDiagnostic('GESTE_AVANT_OUVERTURE', 'fin-7')] });

    const actions = ActionsDirectes.depuis(dossier).actions;

    expect(actions.map(action => [action.saisie.acte(), action.saisie.proposition])).toEqual([
      ['ANNULATION', { kind: 'ANNULATION', pointage: 'fin-7', motif: '' }],
      ['CORRECTION', { kind: 'CORRECTION', pointage: 'fin-7', motif: '', fait: arret.fait }],
    ]);
  });

  it('should not repeat a cancellation the server already proposes for the same pointage', () => {
    const dossier = unConflit({
      journal: [unArret('fin-17')],
      diagnostics: [unDiagnostic('CIBLE_REMPLACEE', 'fin-17')],
      choix: [unChoix(SaisieActe.cancel('fin-17'))],
    });

    expect(ActionsDirectes.depuis(dossier).actions).toEqual([]);
  });

  it('should still offer to cancel a pointage the server only proposes to correct', () => {
    const arret = unArret('fin-17');
    const dossier = unConflit({
      journal: [arret],
      diagnostics: [unDiagnostic('CIBLE_REMPLACEE', 'fin-17')],
      choix: [unChoix(SaisieActe.correct('fin-17', arret.fait))],
    });

    const actions = ActionsDirectes.depuis(dossier).actions;

    expect(actions.map(action => action.saisie.acte())).toEqual(['ANNULATION']);
  });

  it('should not repeat a correction the server already proposes for the same pointage, but keep the cancellation', () => {
    const arret = unArret('fin-7');
    const dossier = unConflit({
      journal: [arret],
      diagnostics: [unDiagnostic('GESTE_AVANT_OUVERTURE', 'fin-7')],
      choix: [unChoix(SaisieActe.correct('fin-7', { ...arret.fait, instant: '2026-09-14T09:00:00-03:00' }))],
    });

    const actions = ActionsDirectes.depuis(dossier).actions;

    expect(actions.map(action => action.saisie.acte())).toEqual(['ANNULATION']);
  });

  it('should keep proposing a cancellation when the server proposes a regularisation', () => {
    const dossier = unConflit({
      journal: [unArret('fin-17')],
      diagnostics: [unDiagnostic('CIBLE_REMPLACEE', 'fin-17')],
      choix: [unChoix(SaisieActe.regularise())],
    });

    const actions = ActionsDirectes.depuis(dossier).actions;

    expect(actions.map(action => action.saisie.acte())).toEqual(['ANNULATION']);
  });

  it('should keep proposing a cancellation when a server proposal carries no act yet', () => {
    const dossier = unConflit({
      journal: [unArret('fin-17')],
      diagnostics: [unDiagnostic('CIBLE_REMPLACEE', 'fin-17')],
      choix: [unChoix(SaisieActe.empty())],
    });

    const actions = ActionsDirectes.depuis(dossier).actions;

    expect(actions.map(action => action.saisie.acte())).toEqual(['ANNULATION']);
  });

  it('should keep proposing a cancellation when the server proposes the same act on another pointage', () => {
    const dossier = unConflit({
      journal: [unArret('fin-17')],
      diagnostics: [unDiagnostic('CIBLE_REMPLACEE', 'fin-17')],
      choix: [unChoix(SaisieActe.cancel('fin-12'))],
    });

    const actions = ActionsDirectes.depuis(dossier).actions;

    expect(actions.map(action => action.pointage.id.pointage)).toEqual(['fin-17']);
  });

  it('should not repeat an action when two diagnostics point at the same pointage', () => {
    const dossier = unConflit({
      journal: [unArret('fin-17')],
      diagnostics: [unDiagnostic('CIBLE_REMPLACEE', 'fin-17'), unDiagnostic('TRANSITION_MEME_CATEGORIE', 'fin-17')],
    });

    const actions = ActionsDirectes.depuis(dossier).actions;

    expect(actions.map(action => action.pointage.id.pointage)).toEqual(['fin-17']);
  });

  it('should not repeat a cancellation when the terminating pointage of one diagnostic is the pointage at fault of another', () => {
    const dossier = unConflit({
      journal: [unArret('fin-17'), unArret('fin-12')],
      diagnostics: [unDiagnostic('CIBLE_DEJA_TERMINEE', 'fin-17', { termineePar: 'fin-12' }), unDiagnostic('CIBLE_REMPLACEE', 'fin-12')],
    });

    const actions = ActionsDirectes.depuis(dossier).actions;

    expect(actions.map(action => action.pointage.id.pointage)).toEqual(['fin-17', 'fin-12']);
  });

  it('should list the actions by diagnostic in the order received, the pointage at fault before its terminating pointage', () => {
    const dossier = unConflit({
      journal: [unArret('fin-17'), unArret('fin-12'), unArret('fin-19')],
      diagnostics: [unDiagnostic('CIBLE_REMPLACEE', 'fin-19'), unDiagnostic('CIBLE_DEJA_TERMINEE', 'fin-17', { termineePar: 'fin-12' })],
    });

    const actions = ActionsDirectes.depuis(dossier).actions;

    expect(actions.map(action => action.pointage.id.pointage)).toEqual(['fin-19', 'fin-17', 'fin-12']);
  });

  it('should offer nothing when the dossier carries no diagnostic', () => {
    const dossier = { enConflit: true, journal: [unArret('fin-17')], choix: [] };

    expect(ActionsDirectes.depuis(dossier).actions).toEqual([]);
  });

  it('should offer nothing once the dossier is no longer in conflict', () => {
    const dossier = unConflit({ enConflit: false, journal: [unArret('fin-17')], diagnostics: [unDiagnostic('CIBLE_REMPLACEE', 'fin-17')] });

    expect(ActionsDirectes.depuis(dossier).actions).toEqual([]);
  });

  const unChoix = (saisie: SaisieActe): ChoixGuide => ({ id: 'choix', libelle: '', explication: '', saisie });

  const unAnnule = (pointage: PointageAnomalie): PointageAnomalie => ({
    ...pointage,
    annulation: { motif: 'Erreur de saisie', auteur: 'gestionnaire', instant: '2026-09-15T08:00:00-03:00' },
  });

  const unique = <T>(elements: readonly T[]): T => {
    expect(elements).toHaveLength(1);
    return elements[0] as T;
  };

  const unArret = (id: string): PointageAnomalie => ({
    id: new PointageAnomalieId(id),
    fait: {
      type: 'FIN',
      intention: 'FIN',
      activiteVisee: 'travail-8',
      operateur: 'op-camille',
      poste: 'poste-1',
      instant: '2026-09-14T17:00:00-03:00',
    },
    operateurNom: 'Camille Martin',
    posteLibelle: 'DMU 50',
    auteur: 'camille',
    enregistre: '2026-09-15T08:00:00-03:00',
    regularisation: false,
  });

  const unDiagnostic = (
    raison: DiagnosticConflit['raison'],
    pointage: string,
    cible: { readonly ouvrant?: string; readonly termineePar?: string } = {},
  ): DiagnosticConflit => ({
    pointage: new PointageAnomalieId(pointage),
    raison,
    cible: {
      activite: new ActiviteAnomalieId('travail-8'),
      ...(cible.ouvrant === undefined ? {} : { ouvrant: new PointageAnomalieId(cible.ouvrant) }),
      ...(cible.termineePar === undefined ? {} : { termineePar: new PointageAnomalieId(cible.termineePar) }),
    },
  });

  const unConflit = (surcharge: Partial<Dossier>): Dossier => ({ enConflit: true, journal: [], diagnostics: [], choix: [], ...surcharge });
});
