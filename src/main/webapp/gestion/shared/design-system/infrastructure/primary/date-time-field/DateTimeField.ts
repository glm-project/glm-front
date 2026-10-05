import { combineLocalDayAndTime, toOffsetIsoString } from '@/app/shared/date-format/infrastructure/primary/DateFormats';
import { Component, input, linkedSignal, output } from '@angular/core';
import { MatDatepicker, MatDatepickerInput, MatDatepickerToggle } from '@angular/material/datepicker';
import { MatTimepicker, MatTimepickerInput, MatTimepickerToggle } from '@angular/material/timepicker';

export interface DateTimeFieldLabels {
  readonly legend: string;
  readonly date: string;
  readonly datePlaceholder: string;
  readonly time: string;
  readonly timePlaceholder: string;
  readonly openTimeList: string;
  readonly timeList: string;
  readonly skippedHour: string;
}

interface Entry {
  readonly shown: Date | null;
  readonly skippedHour: boolean;
  readonly emitted: string | undefined;
}

const entryOf = (value: string): Entry => {
  const instant = new Date(value);
  return { shown: Number.isNaN(instant.getTime()) ? null : instant, skippedHour: false, emitted: undefined };
};

@Component({
  selector: 'glm-date-time-field',
  imports: [MatDatepicker, MatDatepickerInput, MatDatepickerToggle, MatTimepicker, MatTimepickerInput, MatTimepickerToggle],
  templateUrl: './DateTimeField.html',
  styleUrls: ['../forms.css', './DateTimeField.css'],
})
export class DateTimeField {
  readonly fieldId = input.required<string>();
  readonly selector = input.required<string>();
  readonly labels = input.required<DateTimeFieldLabels>();
  readonly value = input.required<string>();
  readonly disabled = input(false);
  readonly valueChanged = output<string>();

  protected readonly entry = linkedSignal<string, Entry>({
    source: this.value,
    computation: (value, previous) => (previous !== undefined && value === previous.value.emitted ? previous.value : entryOf(value)),
  });

  protected compose(day: Date | null, time: Date | null): void {
    const hour = time !== null && !Number.isNaN(time.getTime()) ? time : null;
    const complete = day !== null && hour !== null;
    const instant = complete ? combineLocalDayAndTime(day, hour) : undefined;
    const emitted = instant === undefined ? '' : toOffsetIsoString(instant);
    this.entry.update(entry => ({ ...entry, skippedHour: complete && instant === undefined, emitted }));
    this.valueChanged.emit(emitted);
  }
}
