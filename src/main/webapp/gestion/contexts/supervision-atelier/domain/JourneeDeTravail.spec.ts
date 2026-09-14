import { FenetreDePresence } from './FenetreDePresence';
import { IdentifiantOperateur } from './IdentifiantOperateur';
import { Instant } from './Instant';
import { JourneeDeTravail } from './JourneeDeTravail';

describe('JourneeDeTravail', () => {
  const operateurId = new IdentifiantOperateur('op-1');
  const instant06 = new Instant('2026-09-13T06:00:00.000Z');
  const instant08 = new Instant('2026-09-13T08:00:00.000Z');
  const instant09 = new Instant('2026-09-13T09:00:00.000Z');
  const instant12 = new Instant('2026-09-13T12:00:00.000Z');

  it('should evaluate presence segments for an open visit with multiple windows and intermediate breaks', () => {
    const journee = JourneeDeTravail.open(operateurId, 'PRESENT', [
      new FenetreDePresence(instant06, instant08),
      new FenetreDePresence(instant09, instant12),
    ]);

    const segments = journee.segments(instant12);

    expect(segments).toEqual([
      { debut: instant06, fin: instant08, pause: false, enCours: false },
      { debut: instant08, fin: instant09, pause: true, enCours: false },
      { debut: instant09, fin: instant12, pause: false, enCours: false },
    ]);
  });

  it('should close an unfinished presence window with the evaluation instant and mark it ongoing', () => {
    const journee = JourneeDeTravail.open(operateurId, 'PRESENT', [new FenetreDePresence(instant06)]);

    const segments = journee.segments(instant08);

    expect(segments).toEqual([{ debut: instant06, fin: instant08, pause: false, enCours: true }]);
  });

  it('should append an ongoing pause segment up to now when session is in break', () => {
    const journee = JourneeDeTravail.open(operateurId, 'EN_PAUSE', [new FenetreDePresence(instant06, instant08)]);

    const segments = journee.segments(instant09);

    expect(segments).toEqual([
      { debut: instant06, fin: instant08, pause: false, enCours: false },
      { debut: instant08, fin: instant09, pause: true, enCours: true },
    ]);
  });

  it('should ignore segments with non-positive duration', () => {
    const journee = JourneeDeTravail.open(operateurId, 'PRESENT', [new FenetreDePresence(instant08, instant06)]);

    const segments = journee.segments(instant08);

    expect(segments).toEqual([]);
  });

  it('should produce empty segments when no windows exist', () => {
    const journee = JourneeDeTravail.closed(operateurId);

    expect(journee.segments(instant08)).toEqual([]);
    expect(journee.isOpen()).toBe(false);
    expect(journee.isOpenFor(operateurId)).toBe(false);
    expect(journee.openingInstant()).toBeUndefined();
  });
});
