import { inject, Injectable } from '@angular/core';
import { dansLaPage, DestinationSuivante, LISTE, pageAvant, PLUS_AUCUNE_ANOMALIE } from '../domain/dossier/AnomalieSuivante';
import { AnomaliesReadPort } from '../domain/dossier/AnomaliesReadPort';
import { AdresseDossier, FiltreAnomalies } from '../domain/dossier/DossierAnomalie';

@Injectable()
export class RechercheDeLAnomalieSuivante {
  private readonly lecture = inject(AnomaliesReadPort);

  async destination(origine: AdresseDossier, filtre: FiltreAnomalies): Promise<DestinationSuivante> {
    try {
      return (await this.dansLaListe(filtre, origine)) ?? PLUS_AUCUNE_ANOMALIE;
    } catch {
      return LISTE;
    }
  }

  private async dansLaListe(filtre: FiltreAnomalies, origine: AdresseDossier): Promise<DestinationSuivante | undefined> {
    const trouvee = dansLaPage(await this.lecture.list(filtre), origine);
    if (trouvee !== undefined) return trouvee;
    const avant = pageAvant(filtre);
    return avant === undefined ? undefined : dansLaPage(await this.lecture.list(avant), origine);
  }
}
