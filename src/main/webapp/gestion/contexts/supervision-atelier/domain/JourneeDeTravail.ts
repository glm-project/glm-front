import { FenetreDePresence } from './FenetreDePresence';
import { IdentifiantOperateur } from './IdentifiantOperateur';
import { Instant } from './Instant';
import { SegmentDePresence } from './SegmentDePresence';

export type EtatSession = 'PRESENT' | 'EN_PAUSE';

export class JourneeDeTravail {
  readonly fenetres: readonly FenetreDePresence[];

  private constructor(
    readonly operateurId: IdentifiantOperateur,
    readonly session: EtatSession | undefined,
    fenetres: readonly FenetreDePresence[],
  ) {
    this.fenetres = [...fenetres];
  }

  static open(operateurId: IdentifiantOperateur, session: EtatSession, fenetres: readonly FenetreDePresence[] = []): JourneeDeTravail {
    return new JourneeDeTravail(operateurId, session, fenetres);
  }

  static closed(operateurId: IdentifiantOperateur, fenetres: readonly FenetreDePresence[] = []): JourneeDeTravail {
    return new JourneeDeTravail(operateurId, undefined, fenetres);
  }

  isOpen(): boolean {
    return this.session !== undefined;
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

  segments(maintenant: Instant): readonly SegmentDePresence[] {
    const fenetres = [...this.fenetres].sort((left, right) => left.debut.compare(right.debut));
    return fenetres.flatMap((fenetre, index) => {
      const fin = fenetre.fin ?? maintenant;
      const segments: SegmentDePresence[] = [
        new SegmentDePresence({ debut: fenetre.debut, fin, pause: false, enCours: fenetre.fin === undefined }),
      ];
      const reprise = fenetres[index + 1]?.debut;
      if (reprise) {
        segments.push(new SegmentDePresence({ debut: fin, fin: reprise, pause: true }));
      } else if (this.session === 'EN_PAUSE') {
        segments.push(new SegmentDePresence({ debut: fin, fin: maintenant, pause: true, enCours: true }));
      }
      return segments.filter(segment => segment.fin.compare(segment.debut) > 0);
    });
  }
}
