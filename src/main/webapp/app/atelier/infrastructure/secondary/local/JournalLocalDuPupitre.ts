import { JournalDuPupitrePort } from '@/app/atelier/domain/JournalDuPupitrePort';
import { EvenementLocal, GesteLocal, PUPITRE_VIDE, PupitreLocal, ReferentielDuPupitre } from '@/app/atelier/domain/PupitreLocal';
import { StockageLocalPort } from '@/app/shared/stockage-local/domain/StockageLocalPort';
import { inject, Injectable } from '@angular/core';

const keyFor = (entreprise: string): string => `atelier:${entreprise}`;

const acceptedPointageIdsFor = (suiviId: string, evenements: EvenementLocal[]): string[] =>
  evenements
    .filter(evenement => evenement.etat === 'ACCEPTE' && evenement.geste.nature === 'POINTAGE' && evenement.geste.suiviId === suiviId)
    .map(evenement => evenement.geste.id);

const includeAcceptedPointages = (referentiel: ReferentielDuPupitre, evenements: EvenementLocal[]): ReferentielDuPupitre => ({
  ...referentiel,
  suivis: referentiel.suivis.map(suivi => ({
    ...suivi,
    evenements: [...new Set([...suivi.evenements, ...acceptedPointageIdsFor(suivi.id, evenements)])],
  })),
});

@Injectable()
export class JournalLocalDuPupitre extends JournalDuPupitrePort {
  private readonly stockage = inject(StockageLocalPort);

  override async read(entreprise: string): Promise<PupitreLocal> {
    return (await this.stockage.read<PupitreLocal>(keyFor(entreprise))) ?? PUPITRE_VIDE;
  }

  override async append(entreprise: string, gestes: GesteLocal[]): Promise<void> {
    await this.stockage.update<PupitreLocal>(keyFor(entreprise), PUPITRE_VIDE, current => ({
      ...current,
      evenements: [...current.evenements, ...gestes.map(geste => ({ geste, etat: 'EN_ATTENTE' as const }))],
    }));
  }

  override saveReferentiel(entreprise: string, referentiel: ReferentielDuPupitre): Promise<PupitreLocal> {
    return this.stockage.update<PupitreLocal>(keyFor(entreprise), PUPITRE_VIDE, current => ({
      ...current,
      referentiel: includeAcceptedPointages(referentiel, current.evenements),
    }));
  }

  override saveResult(entreprise: string, resultat: EvenementLocal): Promise<PupitreLocal> {
    return this.stockage.update<PupitreLocal>(keyFor(entreprise), PUPITRE_VIDE, current => ({
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

  override markDisconnected(entreprise: string): Promise<PupitreLocal> {
    return this.stockage.update<PupitreLocal>(keyFor(entreprise), PUPITRE_VIDE, current => ({ ...current, connecte: false }));
  }

  override synchronize<T>(action: () => Promise<T>): Promise<T> {
    return this.stockage.lock('synchronisation', action);
  }

  override withSession<T>(action: () => Promise<T>): Promise<T> {
    return this.stockage.lock('session', action);
  }
}
