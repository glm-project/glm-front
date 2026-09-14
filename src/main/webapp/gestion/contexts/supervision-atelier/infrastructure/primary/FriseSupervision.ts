import { ActiviteDeSupervision } from '../../domain/ActiviteDeSupervision';
import { Instant } from '../../domain/Instant';
import { JourneeDeTravail } from '../../domain/JourneeDeTravail';
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

  presence(journees: readonly JourneeDeTravail[]): readonly SegmentPresence[] {
    return journees.flatMap(journee => this.segmentsJournee(journee)).sort((left, right) => left.debut.compare(right.debut));
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

  private segmentsJournee(journee: JourneeDeTravail): SegmentPresence[] {
    const fenetres = [...journee.fenetres].sort((left, right) => left.debut.compare(right.debut));
    return fenetres.flatMap((fenetre, index) => {
      const fin = fenetre.fin ?? this.maintenant;
      const segments = [this.segment(fenetre.debut, fin, false, fenetre.fin === undefined)];
      const reprise = fenetres[index + 1]?.debut;
      if (reprise) {
        segments.push(this.segment(fin, reprise, true, false));
      } else if (journee.session === 'EN_PAUSE') {
        segments.push(this.segment(fin, this.maintenant, true, true));
      }
      return segments.filter(segment => segment.fin.compare(segment.debut) > 0);
    });
  }

  private segment(debut: Instant, fin: Instant, pause: boolean, enCours: boolean): SegmentPresence {
    const libelle = `${pause ? 'Pause' : 'Présence'} · ${LIBELLES_SUPERVISION.heure(debut)} – ${LIBELLES_SUPERVISION.heure(fin)}${enCours ? ' (en cours)' : ''}`;
    return { debut, fin, pause, libelle, position: this.position(debut, fin) };
  }

  private percent(instant: number): number {
    return ((instant - this.debut) / (this.fin - this.debut)) * 100;
  }
}
