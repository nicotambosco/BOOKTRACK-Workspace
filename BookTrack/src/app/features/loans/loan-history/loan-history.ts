import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Header } from '../../../shared/components/header/header';

@Component({
  selector: 'app-loan-history',
  standalone: true,
  imports: [Header],
  template: `
    <div class="page">
      <app-header [esAdmin]="true"></app-header>
      <div class="content">
        <div class="card">
          <table>
            <thead>
              <tr>
                <th>ESTUDIANTE</th>
                <th>CÓDIGO DE LIBRO</th>
                <th>TIPO DE PRÉSTAMO</th>
                <th>ID</th>
                <th>PERÍODO DE PRÉSTAMO</th>
              </tr>
            </thead>
            <tbody>
              @for (r of historial; track r.id) {
                <tr>
                  <td>{{ r.estudiante }}</td>
                  <td>{{ r.codigo }}</td>
                  <td>{{ r.tipo }}</td>
                  <td>{{ r.id }}</td>
                  <td>{{ r.periodo }}</td>
                </tr>
              }
            </tbody>
          </table>
          <div class="bottom-bar">
            <button class="btn-outline" (click)="volver()">CANCELAR</button>
            <button class="btn-primary" (click)="exportPDF()">IMP. PDF</button>
            <button class="btn-primary" (click)="exportExcel()">IMP. EXCEL</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { display:flex; flex-direction:column; height:100vh; background:#C9A96E; }
    .content { flex:1; display:flex; justify-content:center; align-items:center; padding:2rem; overflow:auto; }
    .card { background:rgba(201,169,110,0.7); padding:2rem; border-radius:8px; width:100%; max-width:900px; display:flex; flex-direction:column; gap:1rem; }
    table { width:100%; border-collapse:collapse; background:white; border-radius:4px; overflow:hidden; }
    th { background:#1a1a1a; color:white; padding:0.5rem; font-size:0.75rem; text-align:left; }
    td { padding:0.5rem; font-size:0.8rem; border-bottom:1px solid #eee; }
    tr:hover td { background:#f5f5f5; }
    .bottom-bar { display:flex; gap:1rem; justify-content:flex-end; }
    .btn-primary { background:#1a1a1a; color:white; border:none; padding:0.5rem 1.2rem; border-radius:4px; cursor:pointer; font-size:0.8rem; }
    .btn-outline { background:transparent; border:2px solid #1a1a1a; padding:0.5rem 1.2rem; border-radius:4px; cursor:pointer; font-size:0.8rem; }
  `]
})
export class LoanHistory {
  historial = [
    { id:'ADM-92118', estudiante:'Joaquin Pingo', codigo:'LIB-ING/SIST-CAM-2017', tipo:'Consulta', periodo:'10/9-16/9' },
    { id:'ADM-26061', estudiante:'Fabian Levano', codigo:'LIB-ART/MUS-MK-199s', tipo:'Base', periodo:'10/8-13/8' },
    { id:'ADM-92118', estudiante:'Roman Rinaldec', codigo:'LIB-ING/SIST-CAM-2017', tipo:'Consulta', periodo:'6/8-13/8' },
  ]; // TODO: LoanService.getHistory()
  constructor(private router: Router) {}
  volver() { this.router.navigate(['/home-admin']); }
  exportPDF() { } // TODO: LoanService.exportPDF()
  exportExcel() { } // TODO: LoanService.exportExcel()
}