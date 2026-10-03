import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'glm-error-message',
  host: { role: 'alert', '[class.error-message--inline]': 'inline()' },
  templateUrl: './ErrorMessage.html',
  styleUrl: './ErrorMessage.css',
  imports: [MatButtonModule],
})
export class ErrorMessage {
  public readonly message = input.required<string>();
  public readonly retryLabel = input.required<string>();
  public readonly retrySelector = input.required<string>();
  public readonly inline = input(false);
  public readonly retryRequested = output();
}
