import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Header } from '../../../shared/components/header/header';
import { LoanService } from '../../../core/services/loan.service';
import { UserService } from '../../../core/services/user.service';
import { Loan } from '../../../models/loan.model';
import { User } from '../../../models/user.model';

// Historial de préstamos de un usuario, visto por el bibliotecario desde la gestión de usuarios.
@Component({
  selector: 'app-user-loans',
  standalone: true,
  imports: [CommonModule, Header],
  template: `
    <div class="home-page">
      <app-header [esAdmin]="true"></app-header>
      <div class="home-body">
        <div class="content-header">
          <div>
            <h2 class="section-title">Historial de préstamos</h2>
            <p class="section-subtitle">
              @if (usuario) { {{ usuario.nombreApellido || 'Sin nombre' }} · Legajo {{ legajo }} } @else { Legajo {{ legajo }} }
            </p>
          </div>
        </div>

        @if (error) { <p class="error" role="alert">{{ error }}</p> }

        <div class="table-card">
          <table>
            <thead>
              <tr><th>LIBRO</th><th>EJEMPLAR</th><th>PERÍODO</th><th>ESTADO</th><th>DEVOLUCIÓN</th></tr>
            </thead>
            <tbody>
              @for (p of prestamos; track p.id) {
                <tr>
                  <td>{{ p.libroTitulo || 'Libro #' + p.libroId }}</td>
                  <td>{{ p.ejemplarId || '-' }}</td>
                  <td>{{ p.fechaInicio }} → {{ p.fechaVencimiento || '-' }}</td>
                  <td><span class="badge" [class]="p.estado">{{ label(p.estado) }}</span></td>
                  <td>{{ p.fechaDevolucion || '-' }}</td>
                </tr>
              } @empty {
                <tr><td colspan="5" class="vacio">{{ cargando ? 'Cargando...' : 'Este usuario no tiene préstamos.' }}</td></tr>
              }
            </tbody>
          </table>
          <div class="bottom">
            <span class="total">{{ prestamos.length }} préstamo/s</span>
            <button class="btn-outline" (click)="volver()">VOLVER</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .home-page { display:flex; flex-direction:column; height:100vh; background:#0d0d0d; }
    .home-body { flex:1; padding:1.5rem 2rem; color:#e8e8e8; display:flex; flex-direction:column; align-items:center; overflow-y:auto; scrollbar-width:thin; scrollbar-color:#3a3a3a transparent; }
    .content-header { display:flex; align-items:center; gap:1rem; margin-bottom:1.5rem; width:100%; max-width:1000px; }
    .section-title { font-family:Georgia, serif; font-size:1.7rem; margin:0 0 0.2rem; color:#f5f5f5; }
    .section-subtitle { margin:0; color:#9a9a9a; font-size:0.9rem; }
    .error { color:#f87171; }
    .table-card { background:#161616; border-radius:12px; padding:1.5rem; display:flex; flex-direction:column; gap:1rem; max-width:1000px; width:100%; }
    table { width:100%; border-collapse:collapse; }
    th { background:#101010; color:#9a9a9a; padding:0.6rem 0.8rem; font-size:0.72rem; text-align:left; letter-spacing:0.03rem; }
    td { padding:0.6rem 0.8rem; font-size:0.82rem; border-bottom:1px solid #232323; }
    tr:hover td { background:#1a1a1a; }
    .badge { padding:0.25rem 0.6rem; border-radius:20px; font-size:0.7rem; }
    .badge.vigente { background:#16301f; color:#4ade80; }
    .badge.devuelto { background:#12293a; color:#60a5fa; }
    .badge.vencido { background:#3a2c12; color:#e8a020; }
    .vacio { text-align:center; color:#8a8a8a; font-style:italic; padding:1rem; }
    .bottom { display:flex; justify-content:space-between; align-items:center; }
    .total { font-size:0.8rem; color:#9a9a9a; }
    .btn-outline { background:transparent; border:1px solid #3a3a3a; color:#e8e8e8; padding:0.55rem 1.4rem; border-radius:20px; cursor:pointer; font-size:0.8rem; }
    .btn-outline:hover { background:#1a1a1a; }
  `]
})
export class UserLoans implements OnInit {
  legajo = '';
  usuario: User | null = null;
  prestamos: Loan[] = [];
  cargando = true;
  error = '';

  constructor(private route: ActivatedRoute, private router: Router, private loanService: LoanService, private userService: UserService) {}

  ngOnInit() {
    this.legajo = this.route.snapshot.paramMap.get('legajo') ?? '';
    this.userService.getById(this.legajo).subscribe({
      next: u => this.usuario = u,
      error: () => this.error = 'No se encontró al usuario.'
    });
    // el bibliotecario recibe todos los préstamos; se queda con los de este legajo
    this.loanService.getAll().subscribe({
      next: loans => { this.prestamos = loans.filter(l => l.estudianteId === this.legajo); this.cargando = false; },
      error: () => { this.error = 'No se pudo cargar el historial.'; this.cargando = false; }
    });
  }

  label(e: string) { return ({ vigente: 'Vigente', vencido: 'Vencido', devuelto: 'Devuelto' } as Record<string, string>)[e] ?? e; }

  volver() { this.router.navigate(['/user-management']); }
}
