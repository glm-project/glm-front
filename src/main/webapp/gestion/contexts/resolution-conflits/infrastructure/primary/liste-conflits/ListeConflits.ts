import { Component, inject, resource } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ConflitsReadPort } from '../../../domain/dossier/ConflitsReadPort';
import { LIBELLES_CONFLITS } from '../LibellesConflits';
import { LIBELLES_LISTE_CONFLITS } from './LibellesListeConflits';

@Component({
  selector: 'glm-liste-conflits',
  templateUrl: './ListeConflits.html',
  imports: [RouterLink],
})
export class ListeConflits {
  private readonly port = inject(ConflitsReadPort);
  protected readonly libelles = { ...LIBELLES_CONFLITS, ...LIBELLES_LISTE_CONFLITS };
  protected readonly liste = resource({ loader: () => this.port.list({ operateur: '', element: '', page: 1 }) });
}
