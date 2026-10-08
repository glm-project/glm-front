import { SaisieActe } from '../acte/SaisieActe';
import { ActiviteAnomalieId } from './ActiviteAnomalieId';
import { ActiviteAnomalie, ChoixGuide } from './DossierAnomalie';
import { PointageAnomalieId } from './PointageAnomalieId';
import { saisieDeRegularisation } from './SaisieDeRegularisation';
import { SuiviAnomalieId } from './SuiviAnomalieId';

const ADRESSE_FIXTURE = { suivi: new SuiviAnomalieId('suivi-1'), pointage: new PointageAnomalieId('debut-8') };

const activiteFixture = (activite: string, ouvrant: string): ActiviteAnomalie => ({
  id: new ActiviteAnomalieId(activite),
  libelle: '',
  etat: 'ECHUE',
  temps: '',
  ouvrant: new PointageAnomalieId(ouvrant),
});

const regulariserFinFixture = (activite: string): ChoixGuide => ({
  id: 'REGULARISER_FIN',
  code: 'REGULARISER_FIN',
  libelle: '',
  explication: '',
  saisie: SaisieActe.regularise({ type: 'FIN', intention: 'FIN', activiteVisee: activite, operateur: 'op-1', poste: '', instant: '' }),
});

type DossierFixture = Parameters<typeof saisieDeRegularisation>[0];

const dossierFixture = (changement: Partial<DossierFixture> = {}): DossierFixture => ({
  ligne: { adresse: ADRESSE_FIXTURE },
  enConflit: false,
  finAutomatique: true,
  activites: [activiteFixture('travail-8', 'debut-8'), activiteFixture('travail-14', 'debut-14')],
  choix: [regulariserFinFixture('travail-8')],
  ...changement,
});

describe('Entry of the regularisation of an automatic end', () => {
  it('should be the entry of the regularisation of the activity opened by the address', () => {
    const dossier = dossierFixture({ choix: [regulariserFinFixture('travail-14'), regulariserFinFixture('travail-8')] });

    expect(saisieDeRegularisation(dossier)).toBe(dossier.choix[1]?.saisie);
  });

  it('should be none when the dossier carries no automatic end', () => {
    expect(saisieDeRegularisation(dossierFixture({ finAutomatique: false }))).toBeUndefined();
  });

  it('should be none when the dossier still has a conflict to explain', () => {
    expect(saisieDeRegularisation(dossierFixture({ enConflit: true }))).toBeUndefined();
  });

  it('should be none when the dossier carries no regularisation of the activity opened by the address', () => {
    expect(saisieDeRegularisation(dossierFixture({ choix: [regulariserFinFixture('travail-14')] }))).toBeUndefined();
  });
});
