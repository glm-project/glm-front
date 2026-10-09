const UNE_MINUTE = 60_000;

export class InstantPointage {
  constructor(readonly value: string) {}

  isValid(): boolean {
    const instant = this.value;
    const iso = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})/;
    if (iso.exec(instant)?.[0] !== instant) return false;
    if (Number(instant.slice(11, 13)) > 23) return false;
    const jour = instant.slice(0, 10);
    const date = new Date(`${jour}T00:00:00Z`);
    return Number.isFinite(Date.parse(instant)) && date.toISOString().slice(0, 10) === jour;
  }

  compareTo(other: InstantPointage): number {
    return Date.parse(this.value) - Date.parse(other.value) || this.fractionSeconde() - other.fractionSeconde();
  }

  firstWholeMinute(): number {
    const minute = Math.ceil(Date.parse(this.value) / UNE_MINUTE) * UNE_MINUTE;
    return new InstantPointage(new Date(minute).toISOString()).compareTo(this) < 0 ? minute + UNE_MINUTE : minute;
  }

  lastWholeMinute(): number {
    return Math.floor(Date.parse(this.value) / UNE_MINUTE) * UNE_MINUTE;
  }

  private fractionSeconde(): number {
    return Number(this.value.slice(19).replace(/Z|[+-]\d{2}:\d{2}/, ''));
  }
}
