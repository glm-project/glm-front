import { Pipe, PipeTransform } from '@angular/core';
import {
  formatInstantLongDay,
  formatInstantLongDayWithSeconds,
  formatInstantTimeAndLongDayWithSeconds,
  toHtmlDatetime,
} from './DateFormats';

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

@Pipe({ name: 'instantLongDayWithSeconds', pure: true })
export class InstantLongDayWithSecondsPipe implements PipeTransform {
  transform(text: string, now: Date): string {
    const instant = instantOf(text);
    return instant === undefined ? text : formatInstantLongDayWithSeconds(instant, now);
  }
}

@Pipe({ name: 'instantTimeAndLongDayWithSeconds', pure: true })
export class InstantTimeAndLongDayWithSecondsPipe implements PipeTransform {
  transform(text: string, now: Date): Readonly<{ time: string; day: string }> {
    const instant = instantOf(text);
    return instant === undefined ? { time: text, day: '' } : formatInstantTimeAndLongDayWithSeconds(instant, now);
  }
}

@Pipe({ name: 'instantDatetime', pure: true })
export class InstantDatetimePipe implements PipeTransform {
  transform(text: string): string | null {
    const instant = instantOf(text);
    return instant === undefined ? null : toHtmlDatetime(instant);
  }
}
