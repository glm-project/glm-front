import { Entreprise } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/Entreprise';
import {
  EMPTY_JOURNAL_DU_PUPITRE,
  EtatDePresence,
  EvenementDuJournal,
  EvenementsDuJournal,
  GesteDAtelier,
  JournalDuPupitre,
  OperateurDuPupitre,
  ReferentielDuPupitre,
} from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import { JournauxDuPupitrePort } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournauxDuPupitrePort';
import { LocalStoragePort } from '@/pupitre/shared/local-storage/domain/LocalStoragePort';
import { inject, Injectable } from '@angular/core';

const keyFor = (entreprise: Entreprise): string => `atelier:${entreprise.toString()}`;

interface EvenementAccepteStocke {
  readonly geste: GesteDAtelier;
  readonly etat: 'ACCEPTE';
  readonly journeeOuverte?: boolean;
  readonly refus?: never;
}
type EvenementStocke = Exclude<EvenementDuJournal, { readonly etat: 'ACCEPTE' }> | EvenementAccepteStocke;
type OperateurStocke = Omit<OperateurDuPupitre, 'etat'> & { readonly etat: EtatDePresence | 'EN_PAUSE' };
type ReferentielStocke = Omit<ReferentielDuPupitre, 'operateurs'> & { readonly operateurs: readonly OperateurStocke[] };
type JournalDuPupitreStocke = Omit<JournalDuPupitre, 'evenements' | 'referentiel'> & {
  readonly evenements: readonly EvenementStocke[];
  readonly referentiel?: ReferentielStocke;
};

const restoreEvenement = (evenement: EvenementStocke): EvenementDuJournal => {
  if (evenement.etat !== 'ACCEPTE') return evenement;
  return evenement.geste.nature === 'ARRIVEE'
    ? { geste: evenement.geste, etat: 'ACCEPTE', journeeOuverte: evenement.journeeOuverte ?? false }
    : { geste: evenement.geste, etat: 'ACCEPTE' };
};

const restoreOperateur = (operateur: OperateurStocke): OperateurDuPupitre => ({
  ...operateur,
  etat: operateur.etat === 'EN_PAUSE' ? 'PRESENT' : operateur.etat,
});

const restoreReferentiel = (referentiel: ReferentielStocke): ReferentielDuPupitre => ({
  ...referentiel,
  operateurs: referentiel.operateurs.map(restoreOperateur),
});

const restoreJournal = ({ referentiel, ...journal }: JournalDuPupitreStocke): JournalDuPupitre => ({
  ...journal,
  evenements: journal.evenements.map(restoreEvenement),
  ...(referentiel === undefined ? {} : { referentiel: restoreReferentiel(referentiel) }),
});

const includeAcceptedPointages = (referentiel: ReferentielDuPupitre, journal: EvenementsDuJournal): ReferentielDuPupitre => ({
  ...referentiel,
  suivis: referentiel.suivis.map(suivi => ({
    ...suivi,
    evenements: [...new Set([...suivi.evenements, ...journal.acceptedPointageIds(suivi.id)])],
  })),
});

const includeAcceptedPresences = (referentiel: ReferentielDuPupitre, journal: EvenementsDuJournal): ReferentielDuPupitre => ({
  ...referentiel,
  operateurs: referentiel.operateurs.map(operateur => ({
    ...operateur,
    evenements: [...new Set([...operateur.evenements, ...journal.acceptedPresenceIds(operateur.id)])],
  })),
});

@Injectable()
export class IndexedDbJournauxDuPupitre extends JournauxDuPupitrePort {
  private readonly stockage = inject(LocalStoragePort);

  override async read(entreprise: Entreprise): Promise<JournalDuPupitre> {
    const stored = await this.stockage.read<JournalDuPupitreStocke>(keyFor(entreprise));
    return stored === undefined ? EMPTY_JOURNAL_DU_PUPITRE : restoreJournal(stored);
  }

  override async append(entreprise: Entreprise, gestes: readonly GesteDAtelier[]): Promise<void> {
    await this.update(entreprise, current => ({
      ...current,
      evenements: [...current.evenements, ...gestes.map(geste => ({ geste, etat: 'EN_ATTENTE' as const }))],
    }));
  }

  override saveReferentiel(entreprise: Entreprise, referentiel: ReferentielDuPupitre): Promise<JournalDuPupitre> {
    return this.update(entreprise, current => {
      const journal = new EvenementsDuJournal(current.evenements);
      return {
        ...current,
        referentiel: includeAcceptedPresences(includeAcceptedPointages(referentiel, journal), journal),
      };
    });
  }

  override saveResult(entreprise: Entreprise, resultat: EvenementDuJournal): Promise<JournalDuPupitre> {
    return this.update(entreprise, current => ({
      ...current,
      connecte: true,
      evenements: current.evenements.map(candidate => {
        if (candidate.geste.id === resultat.geste.id) {
          return resultat;
        }
        return candidate;
      }),
    }));
  }

  override markDisconnected(entreprise: Entreprise): Promise<JournalDuPupitre> {
    return this.update(entreprise, current => ({
      ...current,
      connecte: false,
    }));
  }

  override synchronize<T>(action: () => Promise<T>): Promise<T> {
    return this.stockage.lock('synchronisation', action);
  }

  private update(entreprise: Entreprise, change: (current: JournalDuPupitre) => JournalDuPupitre): Promise<JournalDuPupitre> {
    return this.stockage
      .update<JournalDuPupitreStocke>(keyFor(entreprise), EMPTY_JOURNAL_DU_PUPITRE, current => change(restoreJournal(current)))
      .then(restoreJournal);
  }
}
