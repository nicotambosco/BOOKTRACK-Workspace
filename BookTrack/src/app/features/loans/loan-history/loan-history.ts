import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { CommonModule } from '@angular/common';
import { Header } from '../../../shared/components/header/header';
import { LoanService } from '../../../core/services/loan.service';
import { BookService } from '../../../core/services/book.service';

@Component({
  selector: 'app-loan-history',
  standalone: true,
  imports: [Header, CommonModule],
  template: `
    <div class="home-page">
      <app-header [esAdmin]="true"></app-header>
      <div class="page-body">
        <div class="content-header">
          <div class="title-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M3 3v18h18" stroke="#e8e8e8" stroke-width="2" stroke-linecap="round"/>
              <path d="M7 15l4-4 3 3 5-6" stroke="#e8e8e8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div>
            <h2 class="section-title">Historial de préstamos</h2>
            <p class="section-subtitle">Registro completo de préstamos realizados.</p>
          </div>
        </div>

        <div class="table-card">
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
    .home-page { display:flex; flex-direction:column; min-height:100vh; background:#0d0d0d; }
    .page-body { flex:1; padding: 1.5rem 2rem; color:#e8e8e8; }

    .content-header { display:flex; align-items:center; gap:1rem; margin-bottom: 1.5rem; }
    .title-icon { width:72px; height:72px; background:#1c1c1c; border-radius:14px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .section-title { font-family: Georgia, serif; font-size: 1.7rem; margin: 0 0 0.2rem; color:#f5f5f5; }
    .section-subtitle { margin:0; color:#9a9a9a; font-size:0.9rem; }

    .table-card { background:#161616; border-radius:12px; padding:1.5rem; display:flex; flex-direction:column; gap:1rem; max-width: 1000px; }
    table { width:100%; border-collapse:collapse; }
    th { background:#101010; color:#9a9a9a; padding:0.6rem 0.8rem; font-size:0.72rem; text-align:left; letter-spacing:0.03rem; }
    td { padding:0.6rem 0.8rem; font-size:0.82rem; border-bottom:1px solid #232323; }
    tr:hover td { background:#1a1a1a; }
    .bottom-bar { display:flex; gap:1rem; justify-content:flex-end; }
    .btn-primary {
      background:#2ecc71; color:#0a0a0a; border:none; padding:0.55rem 1.4rem;
      border-radius:20px; cursor:pointer; font-size:0.8rem; font-weight:700;
    }
    .btn-primary:hover { background:#3ddb80; }
    .btn-outline { background:transparent; border:1px solid #3a3a3a; color:#e8e8e8; padding:0.55rem 1.4rem; border-radius:20px; cursor:pointer; font-size:0.8rem; }
    .btn-outline:hover { background:#1a1a1a; }
  `]
})
export class LoanHistory implements OnInit {
  historial: any[] = [];
  private titulosPorLibro = new Map<number, string>();

  constructor(private router: Router, private loanService: LoanService, private bookService: BookService) {}

  ngOnInit() {
    this.bookService.getAll().subscribe(libros => {
      libros.forEach(l => { if (l.id) this.titulosPorLibro.set(l.id, l.titulo); });
    });

    this.loanService.getAll().subscribe(prestamos => {
      this.historial = prestamos.map(p => ({
        id: p.id,
        estudiante: `Usuario #${p.estudianteId}`,
        codigo: this.titulosPorLibro.get(p.libroId) || `Libro #${p.libroId}`,
        tipo: p.tipoPrestamo,
        periodo: `${p.fechaInicio} → ${p.fechaFin || '-'}`
      }));
    });
  }

  volver() { this.router.navigate(['/home-admin']); }

  exportPDF() { this.descargar(this.loanService.exportPDF(), `historiales_prestamos_${new Date().toISOString().split('T')[0]}.pdf`); }
  exportExcel() { this.descargar(this.loanService.exportExcel(), `historiales_prestamos_${new Date().toISOString().split('T')[0]}.xlsx`); }

  private descargar(blob$: Observable<Blob>, nombre: string) {
    blob$.subscribe({
      next: blob => {
        if (blob.size === 0) {
          alert('El archivo no se pudo generar. Verifica con tu administrador.');
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nombre;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 100);
      },
      error: (err) => alert(`Error descargando ${nombre}. Intenta nuevamente.`)
    });
  }
}
