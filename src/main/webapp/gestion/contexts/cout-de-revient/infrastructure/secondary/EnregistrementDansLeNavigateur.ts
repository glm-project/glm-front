import { DOCUMENT, inject, Injectable } from '@angular/core';
import { EnregistrementDeFichierPort } from '../../domain/export/EnregistrementDeFichierPort';
import { FichierExporte } from '../../domain/export/FichierExporte';

@Injectable()
export class EnregistrementDansLeNavigateur extends EnregistrementDeFichierPort {
  private readonly document = inject(DOCUMENT);

  override enregistre(fichier: FichierExporte): void {
    const adresse = URL.createObjectURL(fichier.contenu);
    const lien = this.document.createElement('a');
    lien.href = adresse;
    lien.download = fichier.nom;
    this.document.body.append(lien);
    lien.click();
    lien.remove();
    setTimeout(() => {
      URL.revokeObjectURL(adresse);
    });
  }
}
