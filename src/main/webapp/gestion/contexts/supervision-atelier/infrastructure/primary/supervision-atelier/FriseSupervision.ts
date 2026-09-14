import { ActiviteDeSupervision } from '../../../domain/activite/ActiviteDeSupervision';
import { Instant } from '../../../domain/instant/Instant';
import { SegmentDePresence } from '../../../domain/presence/SegmentDePresence';
import { LIBELLES_SUPERVISION } from './LibellesSupervision';

export interface SegmentPresence {
  readonly debut: Instant;
  readonly fin: Instant;
  readonly pause: boolean;
  readonly libelle: string;
  readonly position: PositionSegment | undefined;
}

export interface PositionSegment {
  readonly gauche: number;
  readonly largeur: number;
}

export interface SegmentActivite {
  readonly activite: ActiviteDeSupervision;
  readonly position: PositionSegment | undefined;
  readonly libelle: string;
}

export class FriseSupervision {
  readonly reperes = ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
  readonly positionMaintenant: number | undefined;
  readonly libelleMaintenant: string;
  private readonly debut: number;
  private readonly fin: number;

  constructor(readonly maintenant: Instant) {
    const date = new Date(maintenant.value);
    this.debut = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 6).getTime();
    this.fin = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 22).getTime();
    const position = this.percent(date.getTime());
    this.positionMaintenant = position >= 0 && position <= 100 ? position : undefined;
    this.libelleMaintenant = `Maintenant (${LIBELLES_SUPERVISION.heure(maintenant)})${this.positionMaintenant === undefined ? ' — hors plage' : ''}`;
  }

  position(debut: Instant, fin: Instant): PositionSegment | undefined {
    const gauche = Math.max(this.debut, new Date(debut.value).getTime());
    const droite = Math.min(this.fin, new Date(fin.value).getTime(), new Date(this.maintenant.value).getTime());
    if (droite < gauche) {
      return undefined;
    }
    return { gauche: this.percent(gauche), largeur: this.percent(droite) - this.percent(gauche) };
  }

  presence(segments: readonly SegmentDePresence[]): readonly SegmentPresence[] {
    return segments.map(segment => ({
      debut: segment.debut,
      fin: segment.fin,
      pause: segment.pause,
      libelle: `${segment.pause ? 'Pause' : 'Présence'} · ${LIBELLES_SUPERVISION.heure(segment.debut)} – ${LIBELLES_SUPERVISION.heure(segment.fin)}${segment.enCours ? ' (en cours)' : ''}`,
      position: this.position(segment.debut, segment.fin),
    }));
  }

  activites(activites: readonly ActiviteDeSupervision[]): readonly SegmentActivite[] {
    return activites.map(activite => {
      const minutes = Math.max(0, Math.floor(this.maintenant.compare(activite.debut) / 60_000));
      const description = [activite.nom, activite.categorie.value, activite.poste].filter(Boolean).join(' · ');
      const position = this.position(activite.debut, this.maintenant);
      return {
        activite,
        position,
        libelle: `${description} · Depuis ${LIBELLES_SUPERVISION.heure(activite.debut)} · ${minutes} min · En cours`,
      };
    });
  }

  private percent(instant: number): number {
    return ((instant - this.debut) / (this.fin - this.debut)) * 100;
  }
}
