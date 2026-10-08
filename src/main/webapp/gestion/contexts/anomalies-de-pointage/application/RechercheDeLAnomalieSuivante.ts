import { inject, Injectable } from '@angular/core';
import { dansLaPage, DestinationSuivante, finRestante, LISTE, pageAvant, PLUS_AUCUNE_ANOMALIE } from '../domain/dossier/AnomalieSuivante';
import { AnomaliesReadPort } from '../domain/dossier/AnomaliesReadPort';
import { AdresseDossier, FiltreAnomalies } from '../domain/dossier/DossierAnomalie';
import { IssueDeLActe } from '../domain/dossier/IssueDeLActe';

@Injectable()
export class RechercheDeLAnomalieSuivante {
  private readonly lecture = inject(AnomaliesReadPort);

  async destination(
    issue: Pick<IssueDeLActe, 'finsAutomatiquesRestantes'>,
    origine: AdresseDossier,
    filtre: FiltreAnomalies,
  ): Promise<DestinationSuivante> {
    const restante = finRestante(issue);
    if (restante !== undefined) return restante;
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
