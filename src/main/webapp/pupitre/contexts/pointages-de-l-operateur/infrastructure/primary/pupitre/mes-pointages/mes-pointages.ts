import { Component, computed, inject, input, output, resource } from '@angular/core';
import { DemandeDePointages } from '../../../../domain/DemandeDePointages';
import { OperateurId } from '../../../../domain/OperateurId';
import { PointagesDeLOperateurPort } from '../../../../domain/PointagesDeLOperateurPort';
import { JourCalendaire } from '../../../../domain/semaine/JourCalendaire';
import { SemaineISO } from '../../../../domain/semaine/SemaineISO';
import { LIBELLES_MES_POINTAGES } from '../LibellesMesPointages';

const deuxChiffres = (valeur: number): string => String(valeur).padStart(2, '0');

const jourLocal = (instant: Date): JourCalendaire =>
  new JourCalendaire(`${String(instant.getFullYear())}-${deuxChiffres(instant.getMonth() + 1)}-${deuxChiffres(instant.getDate())}`);

@Component({
  selector: 'glm-mes-pointages',
  host: { 'data-selector': 'mes-pointages', class: 'flex min-h-0 flex-1 flex-col' },
  templateUrl: './mes-pointages.html',
  styleUrl: './mes-pointages.css',
})
export class MesPointages {
  readonly operateur = input.required<string>();
  readonly retourRequested = output();
  private readonly port = inject(PointagesDeLOperateurPort);
  protected readonly aujourdhui = jourLocal(new Date());
  private readonly semaine = SemaineISO.contenant(this.aujourdhui);
  private readonly demande = computed(() => new DemandeDePointages(new OperateurId(this.operateur()), this.semaine));
  protected readonly pointages = resource({ params: this.demande, loader: ({ params }) => this.port.semaine(params) });
  protected readonly labels = LIBELLES_MES_POINTAGES;
}
