import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { TestBed } from '@angular/core/testing';
import { requiredFixture } from '@test/utils/RequiredFixture';
import { PreparationActe } from '../../../application/PreparationActe';
import { ActeResolution } from '../../../domain/acte/ActeResolution';
import {
  ApercuAnomalie,
  ApplicationActePort,
  PrevisualisationAnomaliePort,
  ResultatApercu,
} from '../../../domain/acte/AnomaliesActesPorts';
import { CadreDuFait } from '../../../domain/acte/CadreDuFait';
import { SaisieActe } from '../../../domain/acte/SaisieActe';
import { AdresseDossier, DossierAnomalie } from '../../../domain/dossier/DossierAnomalie';
import { ElementAnomalieId } from '../../../domain/dossier/ElementAnomalieId';
import { OperateurAnomalieId } from '../../../domain/dossier/OperateurAnomalieId';
import { PerimetreDuDossier } from '../../../domain/dossier/PerimetreDuDossier';
import { PointageAnomalieId } from '../../../domain/dossier/PointageAnomalieId';
import { SuiviAnomalieId } from '../../../domain/dossier/SuiviAnomalieId';
import { ApercuAutomatique } from './ApercuAutomatique';

const dossierFixture = (version: number): DossierAnomalie => ({
  etat: 'FIN_AUTOMATIQUE',
  ligne: {
    adresse: { suivi: new SuiviAnomalieId('suivi-1'), pointage: new PointageAnomalieId('debut-8') },
    element: new ElementAnomalieId('element-1'),
    designation: 'Pièce',
    operateur: 'Camille',
    poste: '',
    date: '2026-09-14',
    explication: 'Fin automatique',
    nombrePointages: 1,
  },
  version,
  cloture: false,
  engagement: '2026-09-14T08:00:00+02:00',
  operateur: new OperateurAnomalieId('op-camille'),
  journal: [],
  perimetre: new PerimetreDuDossier([]),
  activites: [],
  choix: [],
  enConflit: false,
  finAutomatique: true,
  consequences: [],
  continuations: [],
});
const saisieFixture = SaisieActe.cancel('debut-8').afterChange({ motif: 'Double appui' });
const cadreFixture = CadreDuFait.depuis([], '2026-09-14T18:00:00Z');

const apercuFixture = (dossier: DossierAnomalie): ApercuAnomalie => ({
  empreinteConsequences: 'empreinte-1',
  evaluation: '2026-09-14T18:00:00Z',
  commande: 'commande-1',
  version: dossier.version,
  adresse: dossier.ligne.adresse,
  acte: requiredFixture(saisieFixture.command(cadreFixture), 'chosen acte'),
  avant: dossier,
  apres: { ...dossier, finAutomatique: false },
});

class PrevisualisationFixture extends PrevisualisationAnomaliePort {
  readonly requests: { readonly adresse: AdresseDossier; readonly version: number; readonly acte: ActeResolution }[] = [];
  private readonly waiting: { resolve: (resultat: ResultatApercu) => void; reject: (failure: unknown) => void }[] = [];

  override preview(adresse: AdresseDossier, version: number, acte: ActeResolution): Promise<ResultatApercu> {
    this.requests.push({ adresse, version, acte });
    return new Promise((resolve, reject) => this.waiting.push({ resolve, reject }));
  }

  answer(resultat: ResultatApercu): void {
    requiredFixture(this.waiting.shift(), 'pending preview').resolve(resultat);
  }

  fail(failure: unknown): void {
    requiredFixture(this.waiting.shift(), 'pending preview').reject(failure);
  }
}
class ErrorsFixture extends ErrorHandlerPort {
  handled = false;
  override handleError(): void {
    this.handled = true;
  }
}

describe('Automatic background preview of an acte', () => {
  let previews: PrevisualisationFixture;
  let preparation: PreparationActe;
  let apercu: ApercuAutomatique;
  let rereads: DossierAnomalie[];
  let relectures: number;
  const relire = (): Promise<DossierAnomalie | undefined> => {
    relectures += 1;
    return Promise.resolve(rereads.shift());
  };

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    vi.setSystemTime(new Date('2026-09-14T18:00:00Z'));
    previews = new PrevisualisationFixture();
    rereads = [];
    relectures = 0;
    TestBed.configureTestingModule({
      providers: [
        PreparationActe,
        ApercuAutomatique,
        { provide: PrevisualisationAnomaliePort, useValue: previews },
        { provide: ApplicationActePort, useValue: {} },
        { provide: ErrorHandlerPort, useValue: new ErrorsFixture() },
      ],
    });
    preparation = TestBed.inject(PreparationActe);
    apercu = TestBed.inject(ApercuAutomatique);
    preparation.choose(saisieFixture);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should preview 400 ms after the last keystroke, not before', async () => {
    const dossier = dossierFixture(1);
    apercu.apresFrappe(dossier, relire);
    await whenTimeElapses(300);
    apercu.apresFrappe(dossier, relire);

    await whenTimeElapses(399);
    const demandesAvantLeDelai = previews.requests.length;
    await whenTimeElapses(1);

    expect(demandesAvantLeDelai).toBe(0);
    expect(previews.requests).toHaveLength(1);
  });

  it('should preview at once when the handle is released, replacing any pending keystroke delay', async () => {
    const dossier = dossierFixture(1);
    apercu.apresFrappe(dossier, relire);

    void apercu.lancer(dossier, relire);
    await whenTimeElapses(400);

    expect(previews.requests).toHaveLength(1);
  });

  it('should not preview after the delay once cancelled, as when the address changes or the manager validates', async () => {
    apercu.apresFrappe(dossierFixture(1), relire);

    apercu.annuler();
    await whenTimeElapses(400);

    expect(previews.requests).toEqual([]);
  });

  it('should not preview after the delay once the page is destroyed', async () => {
    apercu.apresFrappe(dossierFixture(1), relire);

    whenThePageIsDestroyed();
    await whenTimeElapses(400);

    expect(previews.requests).toEqual([]);
  });

  it('should not occupy the input while the preview is pending, and offer the confirmation once it arrives', async () => {
    const dossier = dossierFixture(1);
    const lancement = apercu.lancer(dossier, relire);
    const etatPendantLAttente = preparation.operation().kind;

    previews.answer({ kind: 'APERCU', apercu: apercuFixture(dossier) });
    await lancement;

    expect(etatPendantLAttente).toBe('APERCU_EN_ARRIERE_PLAN');
    expect(preparation.operation().kind).toBe('REPOS');
    expect(preparation.resolution().confirmation()).toBeDefined();
  });

  it('should preview again on the reread dossier after a concurrent write', async () => {
    rereads.push(dossierFixture(2));
    const lancement = apercu.lancer(dossierFixture(1), relire);

    previews.answer({ kind: 'CONCURRENCE' });
    await whenTimeElapses(0);
    const versionRelancee = previews.requests[1]?.version;
    previews.answer({ kind: 'APERCU', apercu: apercuFixture(dossierFixture(2)) });
    await lancement;

    expect(previews.requests.map(demande => demande.version)).toEqual([1, 2]);
    expect(versionRelancee).toBe(2);
    expect(preparation.resolution().confirmation()).toBeDefined();
  });

  it('should reread and preview only once per launch when the concurrent write repeats', async () => {
    rereads.push(dossierFixture(2), dossierFixture(3));
    const lancement = apercu.lancer(dossierFixture(1), relire);

    previews.answer({ kind: 'CONCURRENCE' });
    await whenTimeElapses(0);
    previews.answer({ kind: 'CONCURRENCE' });
    await lancement;

    expect(previews.requests).toHaveLength(2);
    expect(relectures).toBe(1);
    expect(preparation.operation().kind).toBe('CONCURRENCE');
  });

  it('should not preview again when the dossier could not be reread', async () => {
    const lancement = apercu.lancer(dossierFixture(1), relire);

    previews.answer({ kind: 'CONCURRENCE' });
    await lancement;

    expect(previews.requests).toHaveLength(1);
    expect(preparation.operation().kind).toBe('CONCURRENCE');
  });

  it('should not preview again when the preview is cancelled while the dossier is being reread', async () => {
    let relu: ((dossier: DossierAnomalie) => void) | undefined;
    const relectureEnCours = (): Promise<DossierAnomalie | undefined> =>
      new Promise(resolve => {
        relu = resolve;
      });
    const lancement = apercu.lancer(dossierFixture(1), relectureEnCours);
    previews.answer({ kind: 'CONCURRENCE' });
    await whenTimeElapses(0);

    apercu.annuler();
    requiredFixture(relu, 'pending reread')(dossierFixture(2));
    await lancement;

    expect(previews.requests).toHaveLength(1);
  });

  it('should not preview again after a concurrent write when the preview was cancelled meanwhile', async () => {
    rereads.push(dossierFixture(2));
    const lancement = apercu.lancer(dossierFixture(1), relire);

    apercu.annuler();
    previews.answer({ kind: 'CONCURRENCE' });
    await lancement;

    expect(previews.requests).toHaveLength(1);
    expect(relectures).toBe(0);
  });

  it('should preview again when the manager retries after a failure', async () => {
    const dossier = dossierFixture(1);
    const echec = apercu.lancer(dossier, relire);
    previews.fail(new Error('Réseau coupé'));
    await echec;
    const etatApresLEchec = preparation.operation().kind;

    const reprise = apercu.lancer(dossier, relire);
    previews.answer({ kind: 'APERCU', apercu: apercuFixture(dossier) });
    await reprise;

    expect(etatApresLEchec).toBe('ERREUR');
    expect(previews.requests).toHaveLength(2);
    expect(preparation.resolution().confirmation()).toBeDefined();
  });

  const whenThePageIsDestroyed = (): void => {
    TestBed.resetTestingModule();
  };

  const whenTimeElapses = async (millisecondes: number): Promise<void> => {
    await vi.advanceTimersByTimeAsync(millisecondes);
  };
});
