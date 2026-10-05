import {
  DATE_INPUT_OPTIONS,
  LOCALE,
  TIME_INPUT_OPTIONS,
  TIME_OPTION_LABEL_OPTIONS,
} from '@/app/shared/date-format/infrastructure/primary/DateFormats';
import { Provider } from '@angular/core';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE, MAT_NATIVE_DATE_FORMATS, MatDateFormats } from '@angular/material/core';
import { MatDatepickerIntl } from '@angular/material/datepicker';
import { createDatepickerIntl } from './createDatepickerIntl';
import { GestionDateAdapter } from './GestionDateAdapter';

const GESTION_DATE_FORMATS: MatDateFormats = {
  parse: { dateInput: null, timeInput: null },
  display: {
    ...MAT_NATIVE_DATE_FORMATS.display,
    dateInput: DATE_INPUT_OPTIONS,
    timeInput: TIME_INPUT_OPTIONS,
    timeOptionLabel: TIME_OPTION_LABEL_OPTIONS,
  },
};

export const provideGestionDateAdapter = (): Provider[] => [
  { provide: DateAdapter, useClass: GestionDateAdapter },
  { provide: MAT_DATE_FORMATS, useValue: GESTION_DATE_FORMATS },
  { provide: MAT_DATE_LOCALE, useValue: LOCALE },
  { provide: MatDatepickerIntl, useFactory: createDatepickerIntl },
];
