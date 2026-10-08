import { SaisieActe } from '../acte/SaisieActe';
import { ActiviteAnomalieId } from './ActiviteAnomalieId';
import { choixDeResolution } from './ChoixDeResolution';
import { ActiviteAnomalie, ChoixGuide } from './DossierAnomalie';
import { PointageAnomalieId } from './PointageAnomalieId';
import { SuiviAnomalieId } from './SuiviAnomalieId';

const ADRESSE_FIXTURE = { suivi: new SuiviAnomalieId('suivi-1'), pointage: new PointageAnomalieId('debut-8') };

const activiteFixture = (activite: string, ouvrant: string): ActiviteAnomalie => ({
  id: new ActiviteAnomalieId(activite),
  libelle: '',
  etat: 'ECHUE',
  temps: '',
  ouvrant: new PointageAnomalieId(ouvrant),
});

const choixFixture = (code: NonNullable<ChoixGuide['code']>, saisie: SaisieActe): ChoixGuide => ({
  id: code,
  code,
  libelle: '',
  explication: '',
  saisie,
});

const regulariserFinFixture = (activite: string): ChoixGuide =>
  choixFixture(
    'REGULARISER_FIN',
    SaisieActe.regularise({ type: 'FIN', intention: 'FIN', activiteVisee: activite, operateur: 'op-1', poste: '', instant: '' }),
  );

const annulerTransitionFixture = (): ChoixGuide => choixFixture('ANNULER_TRANSITION', SaisieActe.cancel('nc-12'));

type DossierFixture = Parameters<typeof choixDeResolution>[0];

const dossierFixture = (changement: Partial<DossierFixture> = {}): DossierFixture => ({
  ligne: { adresse: ADRESSE_FIXTURE },
  enConflit: false,
  finAutomatique: true,
  activites: [activiteFixture('travail-8', 'debut-8'), activiteFixture('travail-14', 'debut-14')],
  choix: [regulariserFinFixture('travail-8')],
  ...changement,
});

describe('Resolution choice of an automatic end dossier', () => {
  it('should be the only choice when it targets the activity opened by the address', () => {
    const dossier = dossierFixture();

    expect(choixDeResolution(dossier)).toBe(dossier.choix[0]);
  });

  it('should be none when the dossier carries no automatic end', () => {
    expect(choixDeResolution(dossierFixture({ finAutomatique: false }))).toBeUndefined();
  });

  it('should be none when the dossier still has a conflict to explain', () => {
    expect(choixDeResolution(dossierFixture({ enConflit: true }))).toBeUndefined();
  });

  it('should be none when the dossier carries no choice', () => {
    expect(choixDeResolution(dossierFixture({ choix: [] }))).toBeUndefined();
  });

  it('should be none when the dossier carries a conflict choice beside the end choice', () => {
    expect(choixDeResolution(dossierFixture({ choix: [regulariserFinFixture('travail-8'), annulerTransitionFixture()] }))).toBeUndefined();
  });

  it('should be none when the only choice targets another expired activity than the one the address opens', () => {
    expect(choixDeResolution(dossierFixture({ choix: [regulariserFinFixture('travail-14')] }))).toBeUndefined();
  });

  it('should be none when the only choice targets an activity absent from the dossier', () => {
    expect(choixDeResolution(dossierFixture({ choix: [regulariserFinFixture('inconnue')] }))).toBeUndefined();
  });

  it('should be none when the only choice targets no activity', () => {
    expect(choixDeResolution(dossierFixture({ choix: [annulerTransitionFixture()] }))).toBeUndefined();
  });
});
