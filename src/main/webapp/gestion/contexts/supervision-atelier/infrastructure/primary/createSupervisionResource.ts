import { inject, resource, ResourceRef } from '@angular/core';
import { DonneesDeSupervisionPort } from '../../domain/DonneesDeSupervisionPort';
import { Instant } from '../../domain/Instant';
import { SupervisionDeLAtelier } from '../../domain/SupervisionDeLAtelier';

export const createSupervisionResource = (now: () => Instant): ResourceRef<SupervisionDeLAtelier | undefined> => {
  const donnees = inject(DonneesDeSupervisionPort);
  return resource({
    loader: async () => {
      const maintenant = now();
      const { operateurs, journees, activites } = await donnees.read();
      const resultat = SupervisionDeLAtelier.determine(operateurs, journees, activites, maintenant);
      if (!resultat.estExploitable) {
        throw new Error(resultat.motif);
      }
      return resultat.supervision;
    },
  });
};
