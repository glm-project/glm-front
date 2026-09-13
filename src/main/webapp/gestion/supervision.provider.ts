import { Provider } from '@angular/core';
import { DonneesDeSupervision, DonneesDeSupervisionPort } from './contexts/supervision-atelier/domain/DonneesDeSupervisionPort';
import { IdentifiantOperateur } from './contexts/supervision-atelier/domain/IdentifiantOperateur';
import { JourneeDeTravail } from './contexts/supervision-atelier/domain/JourneeDeTravail';
import { OperateurDeclare } from './contexts/supervision-atelier/domain/OperateurDeclare';
import { InMemoryDonneesDeSupervision } from './contexts/supervision-atelier/infrastructure/secondary/InMemoryDonneesDeSupervision';

export const DONNEES_DE_SUPERVISION_DEMONSTRATION: DonneesDeSupervision = {
  operateurs: [
    new OperateurDeclare(new IdentifiantOperateur('op-chloe'), 'Bernard', 'Chloé'),
    new OperateurDeclare(new IdentifiantOperateur('op-bob'), 'Durand', 'Bob'),
    new OperateurDeclare(new IdentifiantOperateur('op-alice'), 'Martin', 'Alice'),
  ],
  journees: [
    JourneeDeTravail.open(new IdentifiantOperateur('op-bob'), 'EN_PAUSE'),
    JourneeDeTravail.open(new IdentifiantOperateur('op-alice'), 'PRESENT'),
  ],
  activites: [],
};

export const supervisionDemonstrationProvider: Provider[] = [
  {
    provide: DonneesDeSupervisionPort,
    useFactory: () => new InMemoryDonneesDeSupervision(DONNEES_DE_SUPERVISION_DEMONSTRATION),
  },
];
