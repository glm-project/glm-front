import { Component, input, output } from '@angular/core';
import { NatureGeree } from '../../../domain/NatureGeree';

@Component({
  selector: 'glm-colonne-des-natures',
  templateUrl: './ColonneDesNatures.html',
  styleUrl: './ColonneDesNatures.css',
})
export class ColonneDesNatures {
  readonly natures = input.required<readonly NatureGeree[]>();
  readonly choisie = input.required<NatureGeree | undefined>();
  readonly total = input.required<number>();
  readonly lue = input.required<boolean>();
  readonly choisir = output<NatureGeree | undefined>();
}
