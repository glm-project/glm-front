import { Instant } from './Instant';
import { SegmentDePresence } from './SegmentDePresence';

describe('SegmentDePresence', () => {
  const debut = new Instant('2026-09-13T06:00:00.000Z');
  const fin = new Instant('2026-09-13T08:00:00.000Z');

  it('should initialize with provided properties', () => {
    const segment = new SegmentDePresence({ debut, fin, pause: false, enCours: true });

    expect(segment.debut).toBe(debut);
    expect(segment.fin).toBe(fin);
    expect(segment.pause).toBe(false);
    expect(segment.enCours).toBe(true);
  });

  it('should default enCours to false when omitted', () => {
    const segment = new SegmentDePresence({ debut, fin, pause: true });

    expect(segment.enCours).toBe(false);
  });
});
