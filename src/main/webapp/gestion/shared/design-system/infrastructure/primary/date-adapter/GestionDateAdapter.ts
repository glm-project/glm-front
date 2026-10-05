import { Injectable } from '@angular/core';
import { NativeDateAdapter } from '@angular/material/core';

const TYPED_DATE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
const TYPED_TIME = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;
const MONDAY = 1;
const REFERENCE_DAY = { year: 2000, month: 0, day: 1 } as const;

@Injectable()
export class GestionDateAdapter extends NativeDateAdapter {
  override parse(value: unknown, parseFormat?: unknown): Date | null {
    if (typeof value !== 'string') return super.parse(value, parseFormat);
    const text = value.trim();
    if (text === '') return null;
    const [, day, month, year] = TYPED_DATE.exec(text) ?? [];
    return day === undefined ? this.invalid() : this.existingDay(Number(year), Number(month) - 1, Number(day));
  }

  override parseTime(userValue: unknown, parseFormat?: unknown): Date | null {
    if (typeof userValue !== 'string') return super.parseTime(userValue, parseFormat);
    const text = userValue.trim();
    if (text === '') return null;
    const [, hours, minutes, seconds] = TYPED_TIME.exec(text) ?? [];
    return hours === undefined ? this.invalid() : this.existingTime(Number(hours), Number(minutes), Number(seconds ?? 0));
  }

  override setTime(_target: Date, hours: number, minutes: number, seconds: number): Date {
    return super.setTime(new Date(REFERENCE_DAY.year, REFERENCE_DAY.month, REFERENCE_DAY.day), hours, minutes, seconds);
  }

  override getFirstDayOfWeek(): number {
    return MONDAY;
  }

  private existingDay(year: number, month: number, day: number): Date {
    const date = new Date(year, month, day);
    return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day ? date : this.invalid();
  }

  private existingTime(hours: number, minutes: number, seconds: number): Date {
    return hours < 24 && minutes < 60 && seconds < 60 ? this.setTime(this.today(), hours, minutes, seconds) : this.invalid();
  }
}
