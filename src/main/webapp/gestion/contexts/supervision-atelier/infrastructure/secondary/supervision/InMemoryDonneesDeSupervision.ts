import { ActiviteDeSupervision } from '../../../domain/activite/ActiviteDeSupervision';
import { CategorieActivite } from '../../../domain/activite/CategorieActivite';
import { IdentifiantActivite } from '../../../domain/activite/IdentifiantActivite';
import { Instant } from '../../../domain/instant/Instant';
import { IdentifiantOperateur } from '../../../domain/operateur/IdentifiantOperateur';
import { OperateurDeclare } from '../../../domain/operateur/OperateurDeclare';
import { FenetreDePresence } from '../../../domain/presence/FenetreDePresence';
import { JourneeDeTravail } from '../../../domain/presence/JourneeDeTravail';
import { DonneesDeSupervision, DonneesDeSupervisionPort } from '../../../domain/supervision/DonneesDeSupervisionPort';

const buildDemonstration = (instantDemonstration: number): DonneesDeSupervision => {
  const instantBefore = (minutes: number): Instant => new Instant(new Date(instantDemonstration - minutes * 60_000).toISOString());
  return {
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
};

export class InMemoryDonneesDeSupervision extends DonneesDeSupervisionPort {
  // Pris une seule fois : relire l'horloge à chaque lecture ferait avancer tous les « depuis » à chaque actualisation.
  private readonly donnees = buildDemonstration(Date.now());

  read(): Promise<DonneesDeSupervision> {
    return Promise.resolve(this.donnees);
  }
}
