import { Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'glm-text-field',
  templateUrl: './TextField.html',
  styleUrls: ['../forms.css', './TextField.css'],
})
export class TextField {
  readonly fieldId = input.required<string>();
  readonly name = input.required<string>();
  readonly label = input.required<string>();
  readonly labelComplement = input.required<string>();
  readonly value = input.required<string>();
  readonly required = input(false);
  readonly inputMode = input<'decimal'>();
  readonly help = input<string>();
  readonly error = input<string>();
  readonly valueChanged = output<string>();

  protected readonly describedBy = computed(() =>
    this.help() === undefined ? `${this.fieldId()}-error` : `${this.fieldId()}-help ${this.fieldId()}-error`,
  );
}
