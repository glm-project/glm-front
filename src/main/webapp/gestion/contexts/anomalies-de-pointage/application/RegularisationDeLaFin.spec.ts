import { TestBed } from '@angular/core/testing';
import { ActiviteAnomalieId } from '../domain/dossier/ActiviteAnomalieId';
import { AdresseDossier } from '../domain/dossier/DossierAnomalie';
import { PointageAnomalieId } from '../domain/dossier/PointageAnomalieId';
import { SuiviAnomalieId } from '../domain/dossier/SuiviAnomalieId';
import { CommandeDeRegularisation, RegularisationPort, ResultatDeRegularisation } from '../domain/regularisation/RegularisationPort';
import { EtatDeRegularisation, RegularisationDeLaFin } from './RegularisationDeLaFin';

const realSetTimeout = setTimeout;

const ADRESSE: AdresseDossier = { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('debut-8') };
const ACTIVITE = new ActiviteAnomalieId('travail-8');
const FIN = '2026-09-14T17:00:00-03:00';

type Reponse = ResultatDeRegularisation | Error;

class RegularisationFixture extends RegularisationPort {
  readonly commandes: CommandeDeRegularisation[] = [];
  private readonly reponses: Reponse[] = [];
  private arrivee: (() => void) | undefined;
  private liberation: (() => void) | undefined;

  repondre(...reponses: Reponse[]): void {
    this.reponses.push(...reponses);
  }

  retenir(): Promise<void> {
    return new Promise(resolve => {
      this.arrivee = resolve;
    });
  }

  liberer(): void {
    this.liberation?.();
  }

  override regulariser(commande: CommandeDeRegularisation): Promise<ResultatDeRegularisation> {
    this.commandes.push(commande);
    const reponse = this.reponses.shift() ?? { kind: 'REGULARISEE' };
    this.arrivee?.();
    return new Promise((resolve, reject) => {
      const repondre = (): void => {
        if (reponse instanceof Error) reject(reponse);
        else resolve(reponse);
      };
      if (this.arrivee === undefined) realSetTimeout(repondre);
      else this.liberation = repondre;
    });
  }
}

describe('Regularisation of the automatic end of a dossier', () => {
  let port: RegularisationFixture;

  beforeEach(() => {
    port = new RegularisationFixture();
    TestBed.configureTestingModule({ providers: [RegularisationDeLaFin, { provide: RegularisationPort, useValue: port }] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should regularise the aimed activity at the hour of the end, under the identifier of the entry', async () => {
    givenTheEntryIdentifiers('saisie-1');

    await whenValidating(FIN);

    expect(port.commandes).toEqual([{ suivi: ADRESSE.suivi, id: 'saisie-1', activite: ACTIVITE, dateDeSurvenue: FIN }]);
    thenTheStateIs({ kind: 'REGULARISEE', dateDeSurvenue: FIN });
  });

  it('should keep the identifier of the entry when it is sent again after a technical failure', async () => {
    givenTheEntryIdentifiers('saisie-1', 'saisie-2');
    port.repondre(new Error('Réseau coupé'));
    await whenValidating(FIN);

    await whenValidating(FIN);

    expect(port.commandes.map(commande => commande.id)).toEqual(['saisie-1', 'saisie-1']);
    thenTheStateIs({ kind: 'REGULARISEE', dateDeSurvenue: FIN });
  });

  it('should give another identifier to another entry', async () => {
    givenTheEntryIdentifiers('saisie-1', 'saisie-2');
    await whenValidating(FIN);

    await whenValidatingInAnotherEntry(FIN);

    expect(port.commandes.map(commande => commande.id)).toEqual(['saisie-1', 'saisie-2']);
  });

  it('should keep the identifier of the entry when the end is sent again after a refusal', async () => {
    givenTheEntryIdentifiers('saisie-1');
    port.repondre({ kind: 'REFUS', code: 'fin-apres-borne' });
    await whenValidating(FIN);

    await whenValidating('2026-09-14T16:00:00-03:00');

    expect(port.commandes.map(commande => commande.id)).toEqual(['saisie-1', 'saisie-1']);
  });

  it('should tell the refusal by its code', async () => {
    port.repondre({ kind: 'REFUS', code: 'activite-deja-regularisee' });

    await whenValidating(FIN);

    thenTheStateIs({ kind: 'REFUSEE', code: 'activite-deja-regularisee' });
  });

  it('should ask to reread the dossier when another entry was concurrent', async () => {
    port.repondre({ kind: 'CONCURRENCE' });

    await whenValidating(FIN);

    thenTheStateIs({ kind: 'A_RELIRE' });
  });

  it('should tell the failure when the regularisation could not be sent', async () => {
    port.repondre(new Error('Réseau coupé'));

    await whenValidating(FIN);

    thenTheStateIs({ kind: 'ECHEC' });
  });

  it('should send nothing for an end that holds no readable hour', async () => {
    await whenValidating('');

    expect(port.commandes).toEqual([]);
    thenTheStateIs({ kind: 'REPOS' });
  });

  it('should be under way, and send nothing more, while the answer to the first validation is awaited', async () => {
    const arrivee = port.retenir();
    const validation = whenValidating(FIN);
    await arrivee;

    await whenValidating(FIN);
    port.liberer();
    await validation;

    expect(port.commandes).toHaveLength(1);
  });

  it('should be under way while the answer is awaited', async () => {
    const etatPendantLAttente = await whenValidatingAndObservingTheStateWhileTheAnswerIsAwaited();

    expect(etatPendantLAttente).toEqual({ kind: 'EN_COURS' });
  });

  it('should send nothing more once the end is regularised', async () => {
    await whenValidating(FIN);

    await whenValidating('2026-09-14T16:00:00-03:00');

    expect(port.commandes).toHaveLength(1);
  });

  const givenTheEntryIdentifiers = (...identifiants: readonly string[]): void => {
    const generateur = vi.spyOn(crypto, 'randomUUID');
    for (const identifiant of identifiants)
      generateur.mockReturnValueOnce(identifiant as `${string}-${string}-${string}-${string}-${string}`);
  };

  const whenValidatingAndObservingTheStateWhileTheAnswerIsAwaited = async (): Promise<EtatDeRegularisation> => {
    const arrivee = port.retenir();
    const validation = whenValidating(FIN);
    await arrivee;
    const etat = service().etat();
    port.liberer();
    await validation;
    return etat;
  };

  const service = (): RegularisationDeLaFin => TestBed.inject(RegularisationDeLaFin);

  const whenValidating = (dateDeSurvenue: string): Promise<void> => service().valider(ADRESSE, ACTIVITE, dateDeSurvenue);

  const whenValidatingInAnotherEntry = (dateDeSurvenue: string): Promise<void> => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [RegularisationDeLaFin, { provide: RegularisationPort, useValue: port }] });
    return whenValidating(dateDeSurvenue);
  };

  const thenTheStateIs = (attendu: EtatDeRegularisation): void => {
    expect(service().etat()).toEqual(attendu);
  };
});
