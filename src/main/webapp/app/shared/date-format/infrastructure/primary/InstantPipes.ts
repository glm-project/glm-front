import { Pipe, PipeTransform } from '@angular/core';
import { formatInstantLongDay } from './DateFormats';

const instantOf = (text: string): Date | undefined => {
  const instant = new Date(text);
  return Number.isNaN(instant.getTime()) ? undefined : instant;
};

@Pipe({ name: 'instantLongDay', pure: true })
export class InstantLongDayPipe implements PipeTransform {
  transform(text: string, now: Date): string {
    const instant = instantOf(text);
    return instant === undefined ? text : formatInstantLongDay(instant, now);
  }
}
