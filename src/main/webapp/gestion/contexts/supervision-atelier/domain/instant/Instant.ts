import { InstantInvalide } from './InstantInvalide';

export class Instant {
  readonly value: string;
  private readonly milliseconds: number;

  constructor(value: string) {
    const milliseconds = Date.parse(value);
    if (!Instant.isAbsolute(value, milliseconds)) {
      throw new InstantInvalide(value);
    }
    this.milliseconds = milliseconds;
    const fraction = /\.(\d{1,9})/.exec(value)?.[1] ?? '000';
    this.value = `${new Date(milliseconds).toISOString().slice(0, -5)}.${fraction.padEnd(3, '0')}Z`;
  }

  private static isAbsolute(value: string, milliseconds: number): boolean {
    const localDateTime = value.slice(0, 19);
    const isoRepresentation = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})/.exec(value)?.[0];
    return (
      isoRepresentation === value
      && Number.isFinite(milliseconds)
      && new Date(`${localDateTime}Z`).toISOString().slice(0, 19) === localDateTime
    );
  }

  compare(other: Instant): number {
    return this.milliseconds - other.milliseconds;
  }
}
