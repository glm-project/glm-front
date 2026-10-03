import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'glm-confirmation-content',
  templateUrl: './ConfirmationContent.html',
  styleUrl: './ConfirmationContent.css',
  imports: [MatDialogModule, MatButtonModule],
})
export class ConfirmationContent {
  readonly title = input.required<string>();
  readonly cancelLabel = input.required<string>();
  readonly confirmLabel = input.required<string>();
  readonly pendingLabel = input.required<string>();
  readonly pending = input.required<boolean>();
  readonly destructive = input(false);
  readonly refusalMessage = input<string>();
  readonly technicalErrorMessage = input<string>();
  readonly selectorPrefix = input.required<string>();
  readonly cancelRequested = output();
  readonly confirmRequested = output();
}
