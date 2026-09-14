import { Provider } from '@angular/core';
import { ActiviteDeSupervision } from './contexts/supervision-atelier/domain/activite/ActiviteDeSupervision';
import { CategorieActivite } from './contexts/supervision-atelier/domain/activite/CategorieActivite';
import { IdentifiantActivite } from './contexts/supervision-atelier/domain/activite/IdentifiantActivite';
import { Instant } from './contexts/supervision-atelier/domain/instant/Instant';
import { IdentifiantOperateur } from './contexts/supervision-atelier/domain/operateur/IdentifiantOperateur';
import { OperateurDeclare } from './contexts/supervision-atelier/domain/operateur/OperateurDeclare';
import { FenetreDePresence } from './contexts/supervision-atelier/domain/presence/FenetreDePresence';
import { JourneeDeTravail } from './contexts/supervision-atelier/domain/presence/JourneeDeTravail';
import { DonneesDeSupervision, DonneesDeSupervisionPort } from './contexts/supervision-atelier/domain/supervision/DonneesDeSupervisionPort';
import { InMemoryDonneesDeSupervision } from './contexts/supervision-atelier/infrastructure/secondary/supervision/InMemoryDonneesDeSupervision';

const instantDemonstration = Date.now();
const instantBefore = (minutes: number): Instant => new Instant(new Date(instantDemonstration - minutes * 60_000).toISOString());

export const DONNEES_DE_SUPERVISION_DEMONSTRATION: DonneesDeSupervision = {
  operateurs: [
    new OperateurDeclare(new IdentifiantOperateur('op-chloe'), 'Bernard', 'Chloé'),
    new OperateurDeclare(new IdentifiantOperateur('op-bob'), 'Durand', 'Bob'),
    new OperateurDeclare(new IdentifiantOperateur('op-alice'), 'Martin', 'Alice'),
    new OperateurDeclare(new IdentifiantOperateur('op-david'), 'Petit', 'David'),
    new OperateurDeclare(new IdentifiantOperateur('op-emma'), 'Robert', 'Emma'),
    new OperateurDeclare(new IdentifiantOperateur('op-fatima'), 'Simon', 'Fatima'),
    new OperateurDeclare(new IdentifiantOperateur('op-gabriel'), 'Thomas', 'Gabriel'),
  ],
  journees: [
    JourneeDeTravail.open(new IdentifiantOperateur('op-bob'), 'EN_PAUSE', [new FenetreDePresence(instantBefore(180), instantBefore(15))]),
    JourneeDeTravail.open(new IdentifiantOperateur('op-alice'), 'PRESENT', [new FenetreDePresence(instantBefore(180))]),
    JourneeDeTravail.open(new IdentifiantOperateur('op-david'), 'PRESENT', [new FenetreDePresence(instantBefore(120))]),
    JourneeDeTravail.open(new IdentifiantOperateur('op-emma'), 'PRESENT', [new FenetreDePresence(instantBefore(1800))]),
    JourneeDeTravail.open(new IdentifiantOperateur('op-fatima'), 'EN_PAUSE'),
    JourneeDeTravail.closed(new IdentifiantOperateur('op-gabriel'), [new FenetreDePresence(instantBefore(180), instantBefore(30))]),
  ],
  activites: [
    new ActiviteDeSupervision({
      id: new IdentifiantActivite('act-alice-moule'),
      operateurId: new IdentifiantOperateur('op-alice'),
      nom: 'Moule 1015',
      categorie: new CategorieActivite('NC'),
      debut: instantBefore(108),
      poste: 'Tour 1',
    }),
    new ActiviteDeSupervision({
      id: new IdentifiantActivite('act-alice-of'),
      operateurId: new IdentifiantOperateur('op-alice'),
      nom: 'OF-2026-000042',
      categorie: new CategorieActivite('FABRICATION'),
      debut: instantBefore(45),
    }),
    new ActiviteDeSupervision({
      id: new IdentifiantActivite('act-emma-of'),
      operateurId: new IdentifiantOperateur('op-emma'),
      nom: 'OF-2026-000043',
      categorie: new CategorieActivite('FABRICATION'),
      debut: instantBefore(1500),
      poste: 'Fraiseuse 2',
    }),
    new ActiviteDeSupervision({
      id: new IdentifiantActivite('act-gabriel-of'),
      operateurId: new IdentifiantOperateur('op-gabriel'),
      nom: 'OF-2026-000044',
      categorie: new CategorieActivite('FABRICATION'),
      debut: instantBefore(90),
      poste: 'Tour 3',
    }),
  ],
};

export const supervisionDemonstrationProvider: Provider[] = [
  {
    provide: DonneesDeSupervisionPort,
    useFactory: () => new InMemoryDonneesDeSupervision(DONNEES_DE_SUPERVISION_DEMONSTRATION),
  },
];
