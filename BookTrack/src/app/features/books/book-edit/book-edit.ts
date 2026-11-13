import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule, Location } from '@angular/common';
import { Header } from '../../../shared/components/header/header';
import { BookService } from '../../../core/services/book.service';
import { Ejemplar } from '../../../models/book.model';
import { CATEGORIAS } from '../../../models/categories';
import { concat, concatMap, defer, finalize, last, of, tap } from 'rxjs';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { apiErrorMessage } from '../../../core/utils/api-error-message';

@Component({
  selector: 'app-book-edit',
  standalone: true,
  imports: [FormsModule, CommonModule, Header, ConfirmDialog],
  template: `
    <div class="home-page">
      <app-header [esAdmin]="true"></app-header>
      <div class="page-body">
        <div class="content-header">
          <div class="title-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M12 20h9" stroke="#e8e8e8" stroke-width="2" stroke-linecap="round"/>
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" stroke="#e8e8e8" stroke-width="2" stroke-linejoin="round"/>
            </svg>
          </div>
          <div>
            <h2 class="section-title">Editar Libro</h2>
            <p class="section-subtitle">Actualizá los datos del libro o eliminalo del catálogo.</p>
          </div>
        </div>

        <div class="form-card">
          <div class="left-panel">
            <div class="cover-placeholder">
              @if (libro.imagen) {
                <img [src]="libro.imagen" alt="portada" />
              } @else {
                <svg width="50" height="50" viewBox="0 0 60 60" fill="none">
                  <rect x="8" y="4" width="34" height="46" rx="2" stroke="#5a5a5a" stroke-width="2" fill="none"/>
                </svg>
              }
              <input #fileInput type="file" accept="image/*" hidden (change)="onImagenSeleccionada($event)"/>
              <button class="btn-outline btn-sm" [class.btn-overlay]="libro.imagen" (click)="fileInput.click()">CAMBIAR IMAGEN</button>
            </div>
            <div class="campo">
              <label for="categoriaLibro">CATEGORÍA</label>
              <select id="categoriaLibro" [(ngModel)]="categoriaSeleccionada" [disabled]="guardandoTodo">
                <option value="" disabled hidden>seleccionar categoría</option>
                <option *ngFor="let c of categorias" [value]="c">{{ c }}</option>
              </select>
            </div>
            <select [(ngModel)]="libro.anioCursada" [disabled]="guardandoTodo" aria-label="Año de cursada">
              <option [ngValue]="0">General</option>
              <option [ngValue]="1">1.er año</option>
              <option [ngValue]="2">2.º año</option>
              <option [ngValue]="3">3.er año</option>
              <option [ngValue]="4">4.º año</option>
              <option [ngValue]="5">5.º año</option>
              <option [ngValue]="99">Electivas</option>
            </select>
          </div>
          <div class="right-panel">
            <div class="campo"><label>ISBN</label><input [ngModel]="libro.isbn" disabled/></div>
            <div class="campo"><label>TÍTULO</label><input [(ngModel)]="libro.titulo" [disabled]="guardandoTodo" placeholder="Ingrese Título"/></div>
            <div class="campo"><label>AUTOR</label><input [(ngModel)]="libro.autor" [disabled]="guardandoTodo" placeholder="Ingrese Autor"/></div>
            <div class="campo"><label>AÑO DE PUBLICACIÓN</label><input type="number" [(ngModel)]="libro.anioPublicacion" [disabled]="guardandoTodo" placeholder="Ingrese Año de Publicación"/></div>
            <div class="campo"><label>RESUMEN</label><textarea [(ngModel)]="libro.resumen" [disabled]="guardandoTodo" rows="4" placeholder="Ingrese un resumen del libro..."></textarea></div>
            <div class="codigos-row">
              <div class="campo"><label>PALABRAS CLAVE</label><input [(ngModel)]="libro.palabrasClave" [disabled]="guardandoTodo" placeholder="separadas por coma"/></div>
              <div class="campo"><label for="disponiblesLibro">DISPONIBLES</label><input id="disponiblesLibro" [value]="cantidadDisponibles" readonly/></div>
            </div>
              <div class="campo">
                <div class="ejemplares-heading"><label>EJEMPLARES · {{ libro.ejemplares.length }}</label><div class="copy-buttons"><button type="button" class="btn-remove-copy" aria-label="Eliminar ejemplar" title="Eliminar ejemplar seleccionado" (click)="eliminarEjemplar()" [disabled]="ocupadoEjemplares || !ejemplarActual">−</button><button type="button" class="btn-add-copy" aria-label="Agregar ejemplar" title="Agregar ejemplar" (click)="agregarEjemplar()" [disabled]="ocupadoEjemplares || !libro.isbn">+</button></div></div>
                <div class="ejemplares">
                  @for (e of libro.ejemplares; track e.id) {
                    <button type="button" class="ejemplar" [class]="e.estado" [class.seleccionado]="e.id === ejemplarSeleccionado"
                            [attr.aria-pressed]="e.id === ejemplarSeleccionado"
                            [disabled]="ocupadoEjemplares" (click)="seleccionarEjemplar(e.id)">{{ e.id }} · {{ etiquetaEstado(e.estado) }}</button>
                  }
                </div>
              </div>
            @if (mensajeEjemplar) { <p class="copy-message" [attr.role]="errorEjemplar ? 'alert' : 'status'">{{ mensajeEjemplar }}</p> }
            @if (ejemplarActual; as ejemplar) {
              <div class="campo"><label for="codigoEjemplar">CÓDIGO DEL EJEMPLAR</label>
                <div class="codigo-editor"><input id="codigoEjemplar" [(ngModel)]="codigoEjemplar" maxlength="50" [disabled]="ocupadoEjemplares" aria-describedby="codigoAyuda"/><button type="button" class="btn-outline btn-sm" (click)="guardarCodigo()" [disabled]="ocupadoEjemplares || !codigoEjemplar.trim() || codigoEjemplar.trim() === ejemplarSeleccionado">Guardar código</button></div>
                <small id="codigoAyuda">Letras, números, guiones y guiones bajos. Máximo 50 caracteres.</small>
              </div>
            <div class="campo"><label for="estadoEjemplar">ESTADO DEL EJEMPLAR</label>
              <select id="estadoEjemplar" [ngModel]="ejemplar.estado" (ngModelChange)="cambiarEstadoEjemplar($event)"
                      [disabled]="ejemplar.estado === 'prestado' || ocupadoEjemplares">
                @if (ejemplar.estado === 'prestado') { <option value="prestado">Prestado</option> }
                <option value="disponible">Disponible</option>
                <option value="baja">No disponible</option>
              </select>
            </div>
            }
            @if (ejemplarActual; as ejemplar) {
              <div class="campo observaciones-ejemplar">
                <label for="observacionesEjemplar">OBSERVACIONES · {{ ejemplar.id }}</label>
                <textarea id="observacionesEjemplar" rows="3" [ngModel]="borradorObservaciones" (ngModelChange)="editarObservaciones($event)"
                  [disabled]="ocupadoEjemplares" placeholder="Ej.: tapa deteriorada, páginas subrayadas…"></textarea>
                <small>Se mostrarán al seleccionar este ejemplar para un préstamo.</small>
                <button type="button" class="btn-outline btn-sm" (click)="guardarObservaciones()"
                  [disabled]="ocupadoEjemplares || borradorObservaciones.trim() === (ejemplar.observaciones || '')">
                  {{ guardandoObservaciones ? 'Guardando…' : 'Guardar observaciones' }}
                </button>
                @if (mensajeObservaciones) { <p [attr.role]="errorObservaciones ? 'alert' : 'status'" [class.error-observaciones]="errorObservaciones">{{ mensajeObservaciones }}</p> }
              </div>
            }
            <div class="botones">
              <button class="btn-primary" (click)="guardar()" [disabled]="ocupadoEjemplares">{{ guardandoTodo ? 'GUARDANDO…' : 'GUARDAR' }}</button>
              <button class="btn-danger" (click)="eliminar()" [disabled]="ocupadoEjemplares">ELIMINAR LIBRO</button>
              <button class="btn-outline" (click)="salir()" [disabled]="ocupadoEjemplares">SALIR</button>
            </div>
          </div>
        </div>
      </div>
      @if (confirmacionEliminar; as confirmacion) {
        <app-confirm-dialog
          [titulo]="confirmacion.tipo === 'ejemplar' ? '¿Eliminar este ejemplar?' : '¿Eliminar este libro?'"
          [mensaje]="confirmacion.tipo === 'ejemplar' ? 'Se eliminará únicamente la copia ' + confirmacion.codigo + '. El libro y sus otros ejemplares se conservarán.' : 'Se eliminará ' + libro.titulo + ' y sus ejemplares sin historial. Esta acción no se puede deshacer.'"
          [confirmarTexto]="confirmacion.tipo === 'ejemplar' ? 'Eliminar ejemplar' : 'Eliminar libro'"
          (cancelled)="confirmacionEliminar = null" (confirmed)="confirmarEliminacion()">
        </app-confirm-dialog>
      }
      @if (modal) {
        <div class="modal-overlay">
          <div class="modal">
            <p>{{ modalMsg }}</p>
            <button class="btn-primary" (click)="cerrarModal()">CONTINUAR</button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .home-page { display:flex; flex-direction:column; height:100vh; background:#0d0d0d; }
    .page-body {
      flex:1; padding: 1.5rem 2rem; color:#e8e8e8;
      display: flex; flex-direction: column; align-items: center; justify-content: flex-start;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: #3a3a3a transparent;
    }
    .page-body::-webkit-scrollbar { width: 8px; }
    .page-body::-webkit-scrollbar-track { background: transparent; }
    .page-body::-webkit-scrollbar-thumb { background: #3a3a3a; border-radius: 4px; }
    .page-body::-webkit-scrollbar-thumb:hover { background: #4a4a4a; }

    .content-header { display:flex; align-items:center; gap:1rem; margin-bottom: 1.5rem; width: 100%; max-width: 900px; }
    .title-icon { width:72px; height:72px; background:#1c1c1c; border-radius:14px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .section-title { font-family: Georgia, serif; font-size: 1.7rem; margin: 0 0 0.2rem; color:#f5f5f5; }
    .section-subtitle { margin:0; color:#9a9a9a; font-size:0.9rem; }

    .form-card { background:#161616; border-radius:12px; padding:2.5rem; display:flex; gap:2.5rem; max-width: 900px; width: 100%; }
    .left-panel { display:flex; flex-direction:column; gap:1rem; align-items:center; }
    .cover-placeholder {
      position:relative; width:140px; height:190px; border:2px dashed #3a3a3a; border-radius:8px;
      display:flex; flex-direction:column; align-items:center; justify-content:center; gap:0.7rem;
      background:#101010; overflow:hidden;
    }
    .cover-placeholder img { width:100%; height:100%; object-fit:cover; }
    .btn-overlay {
      position:absolute; bottom:0.5rem; left:50%; transform:translateX(-50%);
      background:rgba(16,16,16,0.85); backdrop-filter:blur(2px);
    }
    select { padding:0.5rem; border:1px solid #2a2a2a; border-radius:8px; background:#101010; color:#e8e8e8; font-size:0.8rem; width:140px; }

    .right-panel { flex:1; display:flex; flex-direction:column; gap:1rem; }
    .campo { display:flex; flex-direction:column; gap:0.4rem; }
    .campo label { font-size:0.72rem; font-weight:bold; color:#9a9a9a; letter-spacing:0.03rem; }
    .campo input, .campo textarea {
      padding:0.7rem 0.9rem; border:1px solid #2a2a2a; border-radius:8px;
      background:#101010; color:#e8e8e8; font-size:0.85rem; resize:none;
    }
    .campo input::placeholder, .campo textarea::placeholder { color:#6a6a6a; }
    .ejemplares { display:flex; flex-wrap:wrap; gap:0.4rem; }
    .ejemplares-heading, .codigo-editor { display:flex; align-items:center; gap:.7rem; }
    .ejemplares-heading { justify-content:space-between; }
    .copy-buttons { display:flex; align-items:center; gap:.6rem; }
    .btn-remove-copy { width:36px; height:36px; border-radius:50%; background:#3b1e22; border:1px solid #e47777; color:#ffbaba; font-size:1.5rem; cursor:pointer; }
    .btn-add-copy { width:36px; height:36px; border-radius:50%; background:#2ecc71; border:0; color:#0a0a0a; font-size:1.5rem; cursor:pointer; }
    .codigo-editor input { flex:1; min-width:0; }
    .campo small, .copy-message { color:#aaa; font-size:.75rem; line-height:1.5; }
    .copy-message { margin:0; }
    input[readonly] { color:#bbb; cursor:default; }
    .ejemplar { font:inherit; font-size:0.72rem; padding:0.25rem 0.6rem; border-radius:12px; background:#101010; border:1px solid #2a2a2a; color:#c8c8c8; cursor:pointer; }
    .ejemplar.prestado { border-color:#e8a020; }
    .ejemplar.baja { border-color:#e74c3c; color:#8a8a8a; }
    .ejemplar.seleccionado { background:#1f2a22; color:#f5f5f5; box-shadow:0 0 0 2px #2ecc71; }
    select:disabled { opacity:0.6; cursor:not-allowed; }
    .observaciones-ejemplar { padding:1rem; border:1px solid #333; border-radius:8px; }
    .observaciones-ejemplar small { color:#aaa; font-size:.75rem; line-height:1.5; }
    .observaciones-ejemplar button { align-self:flex-start; }
    .observaciones-ejemplar p { margin:.3rem 0 0; color:#92dcad; font-size:.8rem; }
    .observaciones-ejemplar p.error-observaciones { color:#ffbaba; }
    button:disabled { opacity:.5; cursor:not-allowed; }
    .observaciones-ejemplar textarea:focus-visible, .observaciones-ejemplar button:focus-visible { outline:2px solid #2ecc71; outline-offset:3px; }
    .codigos-row { display:flex; gap:1rem; }
    .codigos-row .campo { flex:1; }

    .botones { display:flex; gap:0.9rem; margin-top:0.5rem; }
    .btn-primary {
      background:#2ecc71; color:#0a0a0a; border:none; padding:0.65rem 2rem;
      border-radius:24px; cursor:pointer; font-size:0.85rem; font-weight:700;
      box-shadow: 0 0 16px rgba(46,204,113,0.35);
    }
    .btn-primary:hover { background:#3ddb80; }
    .btn-outline { background:transparent; border:1px solid #3a3a3a; color:#e8e8e8; padding:0.65rem 2rem; border-radius:24px; cursor:pointer; font-size:0.85rem; }
    .btn-outline:hover { background:#1a1a1a; }
    .btn-outline.btn-sm { padding:0.35rem 0.8rem; font-size:0.7rem; }
    .btn-danger { background:transparent; border:1px solid #e74c3c; color:#e74c3c; padding:0.65rem 2rem; border-radius:24px; cursor:pointer; font-size:0.85rem; }
    .btn-danger:hover { background:rgba(231,76,60,0.1); }

    .modal-overlay { position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); display:flex; justify-content:center; align-items:center; }
    .modal { background:#161616; border:1px solid #2a2a2a; padding:2rem 3rem; border-radius:12px; text-align:center; display:flex; flex-direction:column; gap:1rem; }
    .modal p { font-weight:bold; color:#f5f5f5; margin:0; }
  `]
})
export class BookEdit implements OnInit {
  modal=false; modalMsg=''; categoriaSeleccionada='';
  categorias = CATEGORIAS;
  bookId = '';
  libro = { isbn:'', titulo:'', autor:'', anioCursada: 0, anioPublicacion: null as number | null, resumen:'', palabrasClave:'', imagen:'', disponibles:0, ejemplares: [] as Ejemplar[], estado: 'activo' as 'activo' | 'inactivo' };

  ejemplarSeleccionado: string | null = null;
  guardandoEstado = false;
  guardandoObservaciones = false;
  borradoresObservaciones: Record<string, string> = {};
  mensajeObservaciones = '';
  errorObservaciones = false;
  guardandoEjemplar = false;
  borradoresCodigos: Record<string, string> = {};
  guardandoTodo = false;
  confirmacionEliminar: { tipo: 'libro' | 'ejemplar'; codigo: string } | null = null;
  mensajeEjemplar = '';
  errorEjemplar = false;

  get ocupadoEjemplares() { return this.guardandoTodo || this.guardandoEjemplar || this.guardandoEstado || this.guardandoObservaciones; }
  get codigoEjemplar() { return this.ejemplarSeleccionado ? (this.borradoresCodigos[this.ejemplarSeleccionado] ?? this.ejemplarSeleccionado) : ''; }
  set codigoEjemplar(valor: string) { if (this.ejemplarSeleccionado) this.borradoresCodigos[this.ejemplarSeleccionado] = valor; }
  get cantidadDisponibles() { return this.libro.ejemplares.filter(e => e.estado === 'disponible').length; }

  agregarEjemplar() {
    if (this.ocupadoEjemplares || !this.libro.isbn) return;
    this.guardandoEjemplar = true;
    this.mensajeEjemplar = '';
    this.errorEjemplar = false;
    this.bookService.addCopy(this.bookId || this.libro.isbn).subscribe({
      next: e => {
        this.libro.ejemplares.push(e);
        this.libro.disponibles = this.cantidadDisponibles;
        this.guardandoEjemplar = false;
        this.seleccionarEjemplar(e.id);
        this.mensajeEjemplar = 'Ejemplar agregado.';
        this.changeDetector.markForCheck();
      },
      error: err => this.errorOperacionEjemplar(err, 'No se pudo agregar el ejemplar.')
    });
  }

  eliminarEjemplar() {
    const ejemplar = this.ejemplarActual;
    if (!ejemplar || this.ocupadoEjemplares) return;
    this.confirmacionEliminar = { tipo: 'ejemplar', codigo: ejemplar.id };
  }

  confirmarEliminacion() {
    const confirmacion = this.confirmacionEliminar;
    if (!confirmacion || this.ocupadoEjemplares) return;
    this.confirmacionEliminar = null;
    if (confirmacion.tipo === 'libro') {
      this.eliminarLibroConfirmado();
      return;
    }
    const ejemplar = this.libro.ejemplares.find(e => e.id === confirmacion.codigo);
    if (!ejemplar) return;
    this.guardandoEjemplar = true;
    this.mensajeEjemplar = '';
    this.errorEjemplar = false;
    this.bookService.deleteCopy(ejemplar.id).subscribe({
      next: () => {
        this.libro.ejemplares = this.libro.ejemplares.filter(e => e.id !== ejemplar.id);
        delete this.borradoresObservaciones[ejemplar.id];
        delete this.borradoresCodigos[ejemplar.id];
        this.ejemplarSeleccionado = null;
        this.libro.disponibles = this.cantidadDisponibles;
        this.guardandoEjemplar = false;
        this.mensajeEjemplar = `Ejemplar ${ejemplar.id} eliminado.`;
        this.mensajeObservaciones = '';
        this.changeDetector.markForCheck();
      },
      error: err => this.errorOperacionEjemplar(err, 'No se pudo eliminar el ejemplar.')
    });
  }

  guardarCodigo() {
    const ejemplar = this.ejemplarActual;
    const codigo = this.codigoEjemplar.trim();
    if (!ejemplar || this.ocupadoEjemplares || !codigo || codigo === ejemplar.id) return;
    if (!/^[a-zA-Z0-9_-]{1,50}$/.test(codigo)) {
      this.errorEjemplar = true;
      this.mensajeEjemplar = 'El código admite hasta 50 letras, números, guiones o guiones bajos.';
      return;
    }
    this.guardandoEjemplar = true;
    this.mensajeEjemplar = '';
    this.errorEjemplar = false;
    this.bookService.renameCopy(ejemplar.id, codigo).subscribe({
      next: e => {
        this.aplicarCodigo(ejemplar, e);
        this.guardandoEjemplar = false;
        this.mensajeEjemplar = 'Código actualizado. Se conserva el historial del ejemplar.';
        this.changeDetector.markForCheck();
      },
      error: err => this.errorOperacionEjemplar(err, 'No se pudo guardar el código.')
    });
  }

  private aplicarCodigo(ejemplar: Ejemplar, actualizado: Ejemplar) {
    const anterior = ejemplar.id;
    if (anterior !== actualizado.id) {
      if (this.borradoresObservaciones[anterior] !== undefined) {
        this.borradoresObservaciones[actualizado.id] = this.borradoresObservaciones[anterior];
        delete this.borradoresObservaciones[anterior];
      }
      delete this.borradoresCodigos[anterior];
      if (this.ejemplarSeleccionado === anterior) this.ejemplarSeleccionado = actualizado.id;
    }
    Object.assign(ejemplar, actualizado);
  }

  private errorOperacionEjemplar(err: unknown, fallback: string) {
    this.mensajeEjemplar = apiErrorMessage(err, fallback);
    this.errorEjemplar = true;
    this.guardandoEjemplar = false;
    this.changeDetector.markForCheck();
  }

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private bookService: BookService,
    private location: Location,
    private changeDetector: ChangeDetectorRef
  ) {}

  get ejemplarActual(): Ejemplar | undefined {
    return this.libro.ejemplares.find(e => e.id === this.ejemplarSeleccionado);
  }

  // La base guarda 'baja'; en pantalla es "No disponible".
  etiquetaEstado(estado: Ejemplar['estado']): string {
    return { disponible: 'Disponible', prestado: 'Prestado', baja: 'No disponible' }[estado];
  }

  seleccionarEjemplar(id: string) {
    if (this.ocupadoEjemplares) return;
    this.ejemplarSeleccionado = this.ejemplarSeleccionado === id ? null : id;
    this.mensajeEjemplar = '';
    this.mensajeObservaciones = '';
  }

  get borradorObservaciones(): string {
    const e = this.ejemplarActual;
    return e ? (this.borradoresObservaciones[e.id] ?? e.observaciones ?? '') : '';
  }

  editarObservaciones(valor: string) {
    if (!this.ejemplarActual || this.ocupadoEjemplares) return;
    this.borradoresObservaciones[this.ejemplarActual.id] = valor;
    this.mensajeObservaciones = '';
  }

  guardarObservaciones() {
    const ejemplar = this.ejemplarActual;
    if (!ejemplar || this.ocupadoEjemplares) return;
    const observaciones = this.borradorObservaciones.trim();
    if (observaciones === (ejemplar.observaciones || '')) return;
    this.guardandoObservaciones = true;
    this.mensajeObservaciones = '';
    this.errorObservaciones = false;
    this.bookService.updateCopyObservations(ejemplar.id, observaciones).subscribe({
      next: e => {
        ejemplar.observaciones = e.observaciones;
        delete this.borradoresObservaciones[ejemplar.id];
        this.guardandoObservaciones = false;
        this.mensajeObservaciones = 'Observaciones guardadas.';
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.guardandoObservaciones = false;
        this.errorObservaciones = true;
        this.mensajeObservaciones = 'No se pudieron guardar las observaciones. Podés reintentar.';
        this.changeDetector.markForCheck();
      }
    });
  }

  // Alterna el ejemplar elegido entre disponible y no disponible; un ejemplar prestado solo cambia al devolverse.
  cambiarEstadoEjemplar(estado: Ejemplar['estado']) {
    const ejemplar = this.ejemplarActual;
    if (!ejemplar || ejemplar.estado === 'prestado' || estado === 'prestado' || estado === ejemplar.estado || this.ocupadoEjemplares) return;
    this.guardandoEstado = true;
    this.bookService.updateCopyState(ejemplar.id, estado).subscribe({
      next: e => {
        ejemplar.estado = e.estado;
        this.libro.disponibles = this.libro.ejemplares.filter(x => x.estado === 'disponible').length;
        this.guardandoEstado = false;
      },
      error: () => { this.guardandoEstado = false; this.modalMsg = 'No se pudo cambiar el estado del ejemplar.'; this.modal = true; }
    });
  }

  ngOnInit() {
    this.bookId = this.route.snapshot.paramMap.get('id') ?? '';
    this.bookService.getById(this.bookId).subscribe({
      next: b => {
        this.libro = { ...this.libro, ...b, anioPublicacion: b.anioPublicacion ?? null, ejemplares: b.ejemplares ?? [] };
        this.categoriaSeleccionada = b.categoria;
      },
      error: () => { this.modalMsg='No se pudo cargar el libro.'; this.modal=true; }
    });
  }

  guardar() {
    if (this.ocupadoEjemplares) return;
    if (!this.libro.titulo || !this.libro.autor) { this.modalMsg='¡Revise y complete todos los campos!'; this.modal=true; return; }
    if (!this.categoriaSeleccionada) { this.modalMsg='¡Seleccione una categoría!'; this.modal=true; return; }
    const { ejemplares, disponibles, ...datos } = this.libro;
    const pendientes = ejemplares.map(e => ({
      ejemplar: e,
      codigo: (this.borradoresCodigos[e.id] ?? e.id).trim(),
      observaciones: (this.borradoresObservaciones[e.id] ?? e.observaciones ?? '').trim(),
    })).filter(p => p.codigo !== p.ejemplar.id || p.observaciones !== (p.ejemplar.observaciones || ''));
    if (pendientes.some(p => p.codigo !== p.ejemplar.id && !/^[a-zA-Z0-9_-]{1,50}$/.test(p.codigo))) {
      this.modalMsg = 'Revisá los códigos: usá de 1 a 50 letras, números, guiones o guiones bajos.';
      this.modal = true;
      return;
    }
    this.guardandoTodo = true;
    const categoria = this.categoriaSeleccionada;
    let etapa = 'los datos del libro';
    const operaciones = pendientes.map(p => defer(() => {
      etapa = `el código del ejemplar ${p.ejemplar.id}`;
      const renombrar = p.codigo !== p.ejemplar.id
        ? this.bookService.renameCopy(p.ejemplar.id, p.codigo).pipe(tap(e => this.aplicarCodigo(p.ejemplar, e)))
        : of(p.ejemplar);
      return renombrar.pipe(concatMap(e => {
        etapa = `las observaciones del ejemplar ${e.id}`;
        return p.observaciones !== (e.observaciones || '')
          ? this.bookService.updateCopyObservations(e.id, p.observaciones).pipe(tap(actualizado => {
            p.ejemplar.observaciones = actualizado.observaciones;
            delete this.borradoresObservaciones[e.id];
          })) : of(e);
      }));
    }));
    concat(...operaciones, defer(() => {
      etapa = 'los datos del libro';
      return this.bookService.update(this.bookId, { ...datos, categoria });
    })).pipe(last(), finalize(() => {
      this.guardandoTodo = false;
      this.changeDetector.markForCheck();
    })).subscribe({
      next: () => { this.modalMsg='¡Libro actualizado exitosamente!'; this.modal=true; },
      error: err => {
        const detalle = err.error?.nuevoCodigo ?? err.error?.detail;
        const texto = Array.isArray(detalle) ? detalle.join(' ') : typeof detalle === 'string' ? detalle : '';
        this.modalMsg = `No se pudo guardar ${etapa}. ${texto} Los cambios pendientes se conservan para reintentar.`;
        this.modal = true;
      }
    });
  }

  eliminar() {
    if (this.ocupadoEjemplares) return;
    this.confirmacionEliminar = { tipo: 'libro', codigo: this.bookId };
  }

  private eliminarLibroConfirmado() {
    this.guardandoEjemplar = true;
    this.bookService.delete(this.bookId).pipe(finalize(() => {
      this.guardandoEjemplar = false;
      this.changeDetector.markForCheck();
    })).subscribe({
      next: () => this.router.navigate(['/home-bibliotecario']),
      error: err => { this.modalMsg=apiErrorMessage(err, 'No se pudo eliminar el libro. El servidor no informó el motivo.'); this.modal=true; }
    });
  }

  cerrarModal() { this.modal=false; if (this.modalMsg.includes('exitosamente')) this.location.back(); }

  onImagenSeleccionada(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.bookService.uploadImage(file).subscribe(res => this.libro.imagen = res.url);
  }

  salir() { this.router.navigate(['/home-bibliotecario']); }
}
