import { Instant } from '../instant/Instant';
import { IdentifiantOperateur } from '../operateur/IdentifiantOperateur';
import { FenetreDePresence } from './FenetreDePresence';

export class JourneeDeTravail {
  readonly fenetres: readonly FenetreDePresence[];

  private constructor(
    readonly operateurId: IdentifiantOperateur,
    private readonly ouverte: boolean,
    fenetres: readonly FenetreDePresence[],
  ) {
    this.fenetres = [...fenetres];
  }

  static open(operateurId: IdentifiantOperateur, fenetres: readonly FenetreDePresence[] = []): JourneeDeTravail {
    return new JourneeDeTravail(operateurId, true, fenetres);
  }

  static closed(operateurId: IdentifiantOperateur, fenetres: readonly FenetreDePresence[] = []): JourneeDeTravail {
    return new JourneeDeTravail(operateurId, false, fenetres);
  }

  isOpen(): boolean {
    return this.ouverte;
  }

  isFor(operateurId: IdentifiantOperateur): boolean {
    return this.operateurId.equals(operateurId);
  }

  isOpenFor(operateurId: IdentifiantOperateur): boolean {
    return this.isOpen() && this.isFor(operateurId);
  }

  openingInstant(): Instant | undefined {
    return [...this.fenetres].sort((left, right) => left.debut.compare(right.debut))[0]?.debut;
  }
}
