import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Header } from '../../../shared/components/header/header';
import { LoanService } from '../../../core/services/loan.service';
import { BookService } from '../../../core/services/book.service';
import { ReservationService } from '../../../core/services/reservation.service';
import { Loan } from '../../../models/loan.model';
import { Reservation } from '../../../models/reservation.model';

const ESTADOS_PRESTAMO = ['vigente', 'vencido', 'devuelto'];

interface FilaArchivo {
  clave: string;
  tipo: 'Préstamo' | 'Reserva';
  legajo: string;
  estudiante: string;
  libro: string;
  ejemplar: string;
  periodo: string;
  estado: string;       // clave del estado, también para el color
  etiqueta: string;
  devolucion: string;
  fecha: string;        // para ordenar, más nuevo primero
}

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
            <p class="section-subtitle">Préstamos y reservas ya respondidas, en un solo registro. La exportación incluye los préstamos.</p>
          </div>
        </div>

        <div class="table-card">
          <div class="card-top">
            <div class="filtros">
              <select [(ngModel)]="filtroEstado" (change)="filtrar()" aria-label="Filtrar por estado">
                <option value="">Todos los estados</option>
                <option value="vigente">Préstamos vigentes</option>
                <option value="devuelto">Préstamos devueltos</option>
                <option value="vencido">Préstamos vencidos</option>
                <option value="finalizada">Reservas aprobadas</option>
                <option value="cancelada">Reservas rechazadas o canceladas</option>
                <option value="vencida">Reservas vencidas</option>
              </select>
              <button class="btn-outline btn-sm" (click)="exportPDF()">IMP. PDF</button>
              <button class="btn-outline btn-sm" (click)="exportExcel()">IMP. EXCEL</button>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>TIPO</th>
                <th>LEGAJO</th>
                <th>ESTUDIANTE</th>
                <th>LIBRO</th>
                <th>EJEMPLAR</th>
                <th>PERÍODO</th>
                <th>ESTADO</th>
                <th>DEVOLUCIÓN</th>
              </tr>
            </thead>
            <tbody>
              @for (f of filtrados; track f.clave) {
                <tr>
                  <td>{{ f.tipo }}</td>
                  <td>{{ f.legajo }}</td>
                  <td>{{ f.estudiante }}</td>
                  <td>{{ f.libro }}</td>
                  <td>{{ f.ejemplar }}</td>
                  <td>{{ f.periodo }}</td>
                  <td><span class="badge" [class]="f.estado">{{ f.etiqueta }}</span></td>
                  <td>{{ f.devolucion }}</td>
                </tr>
              } @empty {
                <tr><td colspan="8" class="vacio">Sin registros.</td></tr>
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
    .home-page { display:flex; flex-direction:column; height:100vh; background:#0d0d0d; }
    .home-body {
      flex:1; padding: 1.5rem 2rem; color:#e8e8e8;
      display: flex; flex-direction: column; align-items: center; justify-content: flex-start;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: #3a3a3a transparent;
    }
    .home-body::-webkit-scrollbar { width: 8px; }
    .home-body::-webkit-scrollbar-track { background: transparent; }
    .home-body::-webkit-scrollbar-thumb { background: #3a3a3a; border-radius: 4px; }
    .home-body::-webkit-scrollbar-thumb:hover { background: #4a4a4a; }

    .content-header { display:flex; align-items:center; gap:1rem; margin-bottom: 1.5rem; width: 100%; max-width: 1000px; }
    .title-icon { width:72px; height:72px; background:#1c1c1c; border-radius:14px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .section-title { font-family: Georgia, serif; font-size: 1.7rem; margin: 0 0 0.2rem; color:#f5f5f5; }
    .section-subtitle { margin:0; color:#9a9a9a; font-size:0.9rem; }

    .table-card {
      background:#161616; border-radius:12px; padding:1.5rem; display:flex; flex-direction:column; gap:1rem;
      max-width: 1000px; width: 100%;
      max-height: 70vh; overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: #3a3a3a transparent;
    }
    .table-card::-webkit-scrollbar { width: 8px; }
    .table-card::-webkit-scrollbar-track { background: transparent; }
    .table-card::-webkit-scrollbar-thumb { background: #3a3a3a; border-radius: 4px; }
    .table-card::-webkit-scrollbar-thumb:hover { background: #4a4a4a; }

    .card-top { display:flex; justify-content:flex-end; flex-shrink: 0; }
    .filtros { display:flex; gap:0.6rem; align-items:center; }
    select { padding:0.5rem 0.7rem; border-radius:8px; border:1px solid #2a2a2a; font-size:0.8rem; background:#101010; color:#e8e8e8; }
    .btn-outline.btn-sm { padding:0.4rem 1rem; font-size:0.72rem; }

    table { width:100%; border-collapse:collapse; flex: 1; }
    th { background:#101010; color:#9a9a9a; padding:0.6rem 0.8rem; font-size:0.72rem; text-align:left; letter-spacing:0.03rem; }
    td { padding:0.6rem 0.8rem; font-size:0.82rem; border-bottom:1px solid #232323; }
    tr:hover td { background:#1a1a1a; }
    .badge { padding:0.25rem 0.6rem; border-radius:20px; font-size:0.7rem; }
    .badge.vigente { background:#16301f; color:#4ade80; }
    .badge.devuelto  { background:#12293a; color:#60a5fa; }
    .badge.finalizada { background:#16301f; color:#4ade80; }
    .badge.cancelada { background:#3a1a1a; color:#f87171; }
    .badge.vencida, .badge.vencido { background:#3a2c12; color:#e8a020; }
    .subtitulo { margin:0; font-family: Georgia, serif; font-size:1.05rem; color:#f5f5f5; }
    .table-card + .table-card { margin-top:1.5rem; }
    .vacio { text-align:center; color:#8a8a8a; font-style:italic; padding:1rem; }
    .bottom { display:flex; justify-content:space-between; align-items:center; padding-top:0.5rem; }
    .total { font-size:0.8rem; color:#9a9a9a; }
    .btn-outline { background:transparent; border:1px solid #3a3a3a; color:#e8e8e8; padding:0.55rem 1.4rem; border-radius:20px; cursor:pointer; font-size:0.8rem; }
    .btn-outline:hover { background:#1a1a1a; }
  `]
})
export class LoanArchive implements OnInit {
  prestamos: Loan[] = [];
  reservas: Reservation[] = [];
  filas: FilaArchivo[] = [];
  filtrados: FilaArchivo[] = [];
  filtroEstado = '';
  private titulosPorLibro = new Map<string, string>();

  constructor(public router: Router, private loanService: LoanService, private bookService: BookService, private reservationService: ReservationService) {}

  ngOnInit() {
    this.loanService.getAll().subscribe(l => { this.prestamos = l; this.armar(); });
    this.reservationService.getAll().subscribe(r => { this.reservas = r; this.armar(); });
    this.bookService.getAll().subscribe(libros => {
      libros.forEach(l => { if (l.id) this.titulosPorLibro.set(l.id, l.titulo); });
      this.armar();
    });
  }

  // Las reservas activas siguen esperando respuesta en la gestión; el resto se archiva acá.
  get reservasRespondidas(): Reservation[] { return this.reservas.filter(r => r.estado !== 'activa'); }

  respuesta(r: Reservation): string {
    if (r.estado === 'finalizada') return 'Aprobada';
    if (r.estado === 'cancelada') return r.bibliotecarioId ? 'Rechazada' : 'Cancelada por el usuario';
    return 'Vencida';
  }

  tituloLibro(libroId: string): string {
    return this.titulosPorLibro.get(libroId) ?? `Libro #${libroId}`;
  }

  private armar() {
    const deLosPrestamos = this.prestamos.map((p): FilaArchivo => ({
      clave: `prestamo-${p.id}`, tipo: 'Préstamo', legajo: this.obtenerlLegajo(p), estudiante: this.obtenerNombre(p),
      libro: p.libroTitulo || this.tituloLibro(p.libroId), ejemplar: p.ejemplarId ?? '-',
      periodo: `${p.fechaInicio} → ${p.fechaVencimiento || '-'}`, estado: p.estado, etiqueta: this.label(p.estado),
      devolucion: p.fechaDevolucion || '-', fecha: p.fechaInicio,
    }));
    const deLasReservas = this.reservasRespondidas.map((r): FilaArchivo => ({
      clave: `reserva-${r.id}`, tipo: 'Reserva', legajo: r.estudianteId, estudiante: r.estudianteNombre || `Usuario #${r.estudianteId}`,
      libro: r.libroTitulo || this.tituloLibro(r.libroId),
      ejemplar: this.prestamos.find(p => p.id === r.prestamoId)?.ejemplarId ?? '-',  // el de su préstamo, si se aprobó
      periodo: `${r.fechaRetiro} → ${r.fechaVencimiento}`, estado: r.estado, etiqueta: this.respuesta(r),
      devolucion: '-', fecha: r.fechaReserva,
    }));
    this.filas = [...deLosPrestamos, ...deLasReservas].sort((a, b) => b.fecha.localeCompare(a.fecha));
    this.filtrar();
  }

  filtrar() {
    this.filtrados = this.filtroEstado ? this.filas.filter(f => f.estado === this.filtroEstado) : this.filas;
  }

  label(e: string) { return ({ vigente:'Vigente', vencido:'Vencido', devuelto:'Devuelto' } as any)[e] ?? e; }

  obtenerlLegajo(p: any): string {
    return p.estudianteLegajo || '-';
  }

  obtenerNombre(p: any): string {
    return p.estudianteNombre || `Usuario #${p.estudianteId}`;
  }

  exportPDF() { this.descargar('pdf'); }
  exportExcel() { this.descargar('xlsx'); }

  // La exportación del servidor es de préstamos: un filtro de reservas no se le envía.
  private descargar(tipo: 'pdf' | 'xlsx') {
    const estado = ESTADOS_PRESTAMO.includes(this.filtroEstado) ? this.filtroEstado : undefined;
    const request = tipo === 'pdf' ? this.loanService.exportPDF(estado) : this.loanService.exportExcel(estado);
    request.subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `historial-prestamos.${tipo}`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 100);
      },
      error: () => alert('No se pudo exportar el historial.')
    });
  }
}
