export class Instant {
  readonly value: string;
  private readonly milliseconds: number;

  constructor(value: string) {
    const milliseconds = Date.parse(value);
    if (!Instant.isAbsolute(value, milliseconds)) {
      throw new Error('Invalid absolute supervision instant');
    }
    this.milliseconds = milliseconds;
    this.value = new Date(milliseconds).toISOString();
  }

  private static isAbsolute(value: string, milliseconds: number): boolean {
    const localDateTime = value.slice(0, 19);
    const isoRepresentation = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})/.exec(value)?.[0];
    return (
      isoRepresentation === value
      && Number.isFinite(milliseconds)
      && new Date(`${localDateTime}Z`).toISOString().slice(0, 19) === localDateTime
    );
  }

  equals(other: Instant): boolean {
    return this.milliseconds === other.milliseconds;
  }

  compare(other: Instant): number {
    return this.milliseconds - other.milliseconds;
  }
}
