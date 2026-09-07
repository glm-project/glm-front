import { Component, computed, input } from '@angular/core';
import qrcode from 'qrcode-generator';

const TAILLE_DEDUITE_DU_CONTENU = 0;
const CORRECTION_MOYENNE = 'M';
const MODULES_DE_MARGE = 2;

interface DessinDuQrCode {
  readonly cote: number;
  readonly chemin: string;
}

const dessine = (valeur: string): DessinDuQrCode => {
  const code = qrcode(TAILLE_DEDUITE_DU_CONTENU, CORRECTION_MOYENNE);
  code.addData(valeur);
  code.make();
  const modules = code.getModuleCount();
  const carres: string[] = [];
  for (let ligne = 0; ligne < modules; ligne += 1) {
    for (let colonne = 0; colonne < modules; colonne += 1) {
      if (code.isDark(ligne, colonne)) {
        carres.push(`M${colonne + MODULES_DE_MARGE} ${ligne + MODULES_DE_MARGE}h1v1h-1z`);
      }
    }
  }
  return { cote: modules + MODULES_DE_MARGE * 2, chemin: carres.join('') };
};

@Component({
  selector: 'glm-qr-code',
  host: { 'data-selector': 'qr-code' },
  templateUrl: './qr-code.html',
  styleUrl: './qr-code.css',
})
export class QrCode {
  readonly valeur = input.required<string>();
  readonly description = input.required<string>();

  protected readonly dessin = computed<DessinDuQrCode>(() => dessine(this.valeur()));
}
