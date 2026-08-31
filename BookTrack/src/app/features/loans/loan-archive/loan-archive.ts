import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Header } from '../../../shared/components/header/header';
import { LoanService } from '../../../core/services/loan.service';
import { BookService } from '../../../core/services/book.service';
import { Loan } from '../../../models/loan.model';

@Component({
  selector: 'app-loan-archive',
  standalone: true,
  imports: [CommonModule, FormsModule, Header],
  template: `
    <div class="home-page">
      <app-header [esAdmin]="true"></app-header>
      <div class="home-body">
        <div class="content-header">
          <div class="title-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="5" rx="1" stroke="#e8e8e8" stroke-width="2" fill="none"/>
              <path d="M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9" stroke="#e8e8e8" stroke-width="2"/>
              <path d="M10 13h4" stroke="#e8e8e8" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <div>
            <h2 class="section-title">Archivo de Préstamos</h2>
            <p class="section-subtitle">Consultá y exportá el registro histórico completo.</p>
          </div>
        </div>

        <div class="table-card">
          <div class="card-top">
            <div class="filtros">
              <select [(ngModel)]="filtroEstado" (change)="filtrar()">
                <option value="">Todos los estados</option>
                <option value="aprobado">Activos</option>
                <option value="devuelto">Devueltos</option>
                <option value="denegado">Denegados</option>
                <option value="pendiente">Pendientes</option>
              </select>
              <button class="btn-outline btn-sm" (click)="exportPDF()">IMP. PDF</button>
              <button class="btn-outline btn-sm" (click)="exportExcel()">IMP. EXCEL</button>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>ESTUDIANTE</th>
                <th>LIBRO</th>
                <th>TIPO</th>
                <th>PERÍODO</th>
                <th>ESTADO</th>
              </tr>
            </thead>
            <tbody>
              @for (p of filtrados; track p.id) {
                <tr>
                  <td>Usuario #{{ p.estudianteId }}</td>
                  <td>{{ tituloLibro(p.libroId) }}</td>
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
    .home-page { display:flex; flex-direction:column; min-height:100vh; background:#0d0d0d; }
    .home-body { flex:1; padding: 1.5rem 2rem; color:#e8e8e8; }

    .content-header { display:flex; align-items:center; gap:1rem; margin-bottom: 1.5rem; }
    .title-icon { width:72px; height:72px; background:#1c1c1c; border-radius:14px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .section-title { font-family: Georgia, serif; font-size: 1.7rem; margin: 0 0 0.2rem; color:#f5f5f5; }
    .section-subtitle { margin:0; color:#9a9a9a; font-size:0.9rem; }

    .table-card { background:#161616; border-radius:12px; padding:1.5rem; display:flex; flex-direction:column; gap:1rem; max-width: 1000px; }
    .card-top { display:flex; justify-content:flex-end; }
    .filtros { display:flex; gap:0.6rem; align-items:center; }
    select { padding:0.5rem 0.7rem; border-radius:8px; border:1px solid #2a2a2a; font-size:0.8rem; background:#101010; color:#e8e8e8; }
    .btn-outline.btn-sm { padding:0.4rem 1rem; font-size:0.72rem; }

    table { width:100%; border-collapse:collapse; }
    th { background:#101010; color:#9a9a9a; padding:0.6rem 0.8rem; font-size:0.72rem; text-align:left; letter-spacing:0.03rem; }
    td { padding:0.6rem 0.8rem; font-size:0.82rem; border-bottom:1px solid #232323; }
    tr:hover td { background:#1a1a1a; }
    .badge { padding:0.25rem 0.6rem; border-radius:20px; font-size:0.7rem; }
    .badge.aprobado { background:#16301f; color:#4ade80; }
    .badge.pendiente { background:#332a12; color:#facc15; }
    .badge.devuelto  { background:#12293a; color:#60a5fa; }
    .badge.denegado  { background:#331616; color:#f87171; }
    .vacio { text-align:center; color:#8a8a8a; font-style:italic; padding:1rem; }
    .bottom { display:flex; justify-content:space-between; align-items:center; padding-top:0.5rem; }
    .total { font-size:0.8rem; color:#9a9a9a; }
    .btn-outline { background:transparent; border:1px solid #3a3a3a; color:#e8e8e8; padding:0.55rem 1.4rem; border-radius:20px; cursor:pointer; font-size:0.8rem; }
    .btn-outline:hover { background:#1a1a1a; }
  `]
})
export class LoanArchive implements OnInit {
  prestamos: Loan[] = [];
  filtrados: Loan[] = [];
  filtroEstado = '';
  private titulosPorLibro = new Map<number, string>();

  constructor(public router: Router, private loanService: LoanService, private bookService: BookService) {}

  ngOnInit() {
    this.loanService.getAll().subscribe(l => { this.prestamos = l; this.filtrar(); });
    this.bookService.getAll().subscribe(libros => {
      libros.forEach(l => { if (l.id) this.titulosPorLibro.set(l.id, l.titulo); });
    });
  }

  tituloLibro(libroId: number): string {
    return this.titulosPorLibro.get(libroId) ?? `Libro #${libroId}`;
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
