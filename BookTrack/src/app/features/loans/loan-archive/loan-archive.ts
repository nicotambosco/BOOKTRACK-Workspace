import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Header } from '../../../shared/components/header/header';
import { LoanService } from '../../../core/services/loan.service';
import { Loan } from '../../../models/loan.model';

@Component({
  selector: 'app-loan-archive',
  standalone: true,
  imports: [CommonModule, FormsModule, Header],
  template: `
    <div class="page">
      <app-header [esAdmin]="true"></app-header>
      <div class="content">
        <div class="card">
          <div class="card-top">
            <h2>Archivo de Préstamos</h2>
            <div class="filtros">
              <select [(ngModel)]="filtroEstado" (change)="filtrar()">
                <option value="">Todos los estados</option>
                <option value="aprobado">Activos</option>
                <option value="devuelto">Devueltos</option>
                <option value="denegado">Denegados</option>
                <option value="pendiente">Pendientes</option>
              </select>
              <button class="btn-export" (click)="exportPDF()">PDF</button>
              <button class="btn-export" (click)="exportExcel()">EXCEL</button>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>ESTUDIANTE</th>
                <th>CÓDIGO LIBRO</th>
                <th>TIPO</th>
                <th>PERÍODO</th>
                <th>ESTADO</th>
              </tr>
            </thead>
            <tbody>
              @for (p of filtrados; track p.id) {
                <tr>
                  <td>Usuario #{{ p.estudianteId }}</td>
                  <td>Libro #{{ p.libroId }}</td>
                  <td>{{ p.tipoPrestamo }}</td>
                  <td>{{ p.fechaInicio }} → {{ p.fechaFin || '-' }}</td>
                  <td><span class="badge" [class]="p.estado">{{ label(p.estado) }}</span></td>
                </tr>
              }
              @if (filtrados.length === 0) {
                <tr><td colspan="5" class="vacio">Sin registros.</td></tr>
              }
            </tbody>
          </table>

          <div class="bottom">
            <span class="total">{{ filtrados.length }} registro/s</span>
            <button class="btn-outline" (click)="router.navigate(['/home-admin'])">VOLVER</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { display:flex; flex-direction:column; min-height:100vh; background:#C9A96E; }
    .content { flex:1; display:flex; justify-content:center; padding:2rem; }
    .card { background:rgba(212,184,150,0.85); padding:1.5rem 2rem; border-radius:8px; width:100%; max-width:900px; display:flex; flex-direction:column; gap:1rem; box-shadow:0 2px 8px rgba(0,0,0,0.15); align-self:flex-start; }
    .card-top { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem; }
    .card-top h2 { font-family:Georgia,serif; font-size:1.1rem; font-weight:bold; margin:0; }
    .filtros { display:flex; gap:0.6rem; align-items:center; }
    select { padding:0.3rem 0.6rem; border-radius:4px; border:1px solid #999; font-size:0.8rem; background:white; }
    .btn-export { background:#1a1a1a; color:white; border:none; padding:0.3rem 0.8rem; border-radius:4px; cursor:pointer; font-size:0.75rem; }
    table { width:100%; border-collapse:collapse; background:white; border-radius:6px; overflow:hidden; }
    th { background:#1a1a1a; color:white; padding:0.5rem 0.8rem; font-size:0.75rem; text-align:left; }
    td { padding:0.5rem 0.8rem; font-size:0.8rem; border-bottom:1px solid #eee; }
    tr:hover td { background:#fafafa; }
    .badge { padding:0.2rem 0.5rem; border-radius:20px; font-size:0.7rem; }
    .badge.aprobado { background:#d4edda; color:#155724; }
    .badge.pendiente { background:#fff3cd; color:#856404; }
    .badge.devuelto  { background:#d1ecf1; color:#0c5460; }
    .badge.denegado  { background:#f8d7da; color:#721c24; }
    .vacio { text-align:center; color:#888; font-style:italic; padding:1rem; }
    .bottom { display:flex; justify-content:space-between; align-items:center; padding-top:0.5rem; }
    .total { font-size:0.8rem; color:#555; }
    .btn-outline { background:transparent; border:2px solid #1a1a1a; padding:0.5rem 1.2rem; border-radius:20px; cursor:pointer; font-size:0.82rem; }
  `]
})
export class LoanArchive implements OnInit {
  prestamos: Loan[] = [];
  filtrados: Loan[] = [];
  filtroEstado = '';

  constructor(public router: Router, private loanService: LoanService) {}

  ngOnInit() {
    this.loanService.getAll().subscribe(l => { this.prestamos = l; this.filtrar(); });
  }

  filtrar() {
    this.filtrados = this.filtroEstado
      ? this.prestamos.filter(p => p.estado === this.filtroEstado)
      : this.prestamos;
  }

  label(e: string) { return ({ pendiente:'Pendiente', aprobado:'Activo', devuelto:'Devuelto', denegado:'Denegado' } as any)[e] ?? e; }
  exportPDF()   { this.loanService.exportPDF().subscribe(); }
  exportExcel() { this.loanService.exportExcel().subscribe(); }
}
