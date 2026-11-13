import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Header } from '../../../shared/components/header/header';
import { AdminActionService } from '../../../core/services/admin-action.service';
import { AdminAction } from '../../../models/admin-action.model';

@Component({
  selector: 'app-admin-activity',
  imports: [CommonModule, FormsModule, RouterLink, Header],
  templateUrl: './admin-activity.html',
  styleUrl: './admin-activity.scss',
})
export class AdminActivity implements OnInit {
  private service = inject(AdminActionService);
  acciones = signal<AdminAction[]>([]);
  cargando = signal(false);
  error = signal('');
  busqueda = '';
  tipo = '';
  responsable = '';
  desde = '';
  hasta = '';
  pagina = 1;
  readonly porPagina = 20;
  readonly tipos: Record<string, string> = { retiro_reserva: 'Creación de préstamo', devolucion: 'Devolución', cancelacion_reserva: 'Cancelación de reserva', alta_ejemplar: 'Alta de ejemplar', codigo_ejemplar: 'Cambio de código', eliminacion_ejemplar: 'Eliminación de ejemplar' };

  ngOnInit() { this.cargar(); }
  cargar() {
    if (this.cargando()) return;
    this.cargando.set(true);
    this.error.set('');
    this.service.getAll().subscribe({
      next: acciones => {
        this.acciones.set([...acciones].sort((a,b) => b.fecha.localeCompare(a.fecha) || b.id-a.id));
        this.pagina = 1;
        this.cargando.set(false);
      },
      error: () => { this.error.set('No se pudo cargar la actividad administrativa.'); this.cargando.set(false); },
    });
  }
  etiqueta(tipo: string) { return this.tipos[tipo] ?? tipo; }
  get responsables() {
    return [...new Map(this.acciones().filter(a => a.bibliotecarioId).map(a => [a.bibliotecarioId!, a.bibliotecarioNombre || a.bibliotecarioId!])).entries()];
  }
  get fechasInvalidas() { return !!(this.desde && this.hasta && this.desde > this.hasta); }
  get filtradas() {
    if (this.fechasInvalidas) return [];
    const normalizar = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const q = normalizar(this.busqueda.trim());
    return this.acciones().filter(a => {
      const fecha = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(a.fecha));
      const texto = [a.id, a.descripcion, this.etiqueta(a.tipoAccion), a.bibliotecarioNombre, a.bibliotecarioId, a.estudianteNombre, a.estudianteId, a.libroTitulo, a.libroId, a.ejemplarId, a.reservaId, a.prestamoId].filter(v => v != null).join(' ');
      return (!this.tipo || a.tipoAccion === this.tipo) && (!this.responsable || a.bibliotecarioId === this.responsable)
        && (!this.desde || fecha >= this.desde) && (!this.hasta || fecha <= this.hasta) && normalizar(texto).includes(q);
    });
  }
  get paginas() { return Math.max(1, Math.ceil(this.filtradas.length / this.porPagina)); }
  get visibles() { return this.filtradas.slice((this.pagina-1)*this.porPagina, this.pagina*this.porPagina); }
  filtrar() { this.pagina = 1; }
  limpiar() { this.busqueda = this.tipo = this.responsable = this.desde = this.hasta = ''; this.filtrar(); }
}
