import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { HttpTestingController } from '@angular/common/http/testing';
import { BookAdd } from './book-add/book-add';
import { BookEdit } from './book-edit/book-edit';
import { BookManagement } from './book-management/book-management';
import { BookDetail } from './book-detail/book-detail';
import { HomeUser } from '../home/home-user/home-user';
import { environment } from '../../../environments/environment';
import { fakeJwt, testProviders } from '../../testing/test-providers';

const API = environment.apiUrl;

describe('BookAdd screen', () => {
  let page: BookAdd;
  let ctrl: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [BookAdd], providers: testProviders });
    page = TestBed.createComponent(BookAdd).componentInstance;
    ctrl = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    page.ngOnInit();
  });
  afterEach(() => ctrl.verify());

  it('uses the fixed category names', () => {
    expect(page.categorias).toEqual(['Basicas', 'Electrica', 'Mecanica', 'Quimica', 'Sistemas']);
  });

  it('requires ISBN, title and author', () => {
    page.guardar();
    expect(page.modalMsg).toBe('¡Revise y complete todos los campos!');
    expect(page.modal).toBe(true);
  });

  it('requires a category', () => {
    page.libro.isbn = '9780000000001'; page.libro.titulo = 'Cálculo'; page.libro.autor = 'Stewart';
    page.guardar();
    expect(page.modalMsg).toBe('¡Seleccione una categoría!');
  });

  it('creates the book with the chosen category and returns to the admin home on close', () => {
    page.libro.isbn = ' 9780000000001 '; page.libro.titulo = 'Cálculo'; page.libro.autor = 'Stewart'; page.categoriaSeleccionada = 'Basicas'; page.libro.anioCursada = 3;
    page.guardar();
    const req = ctrl.expectOne(`${API}/books/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toMatchObject({ isbn: '9780000000001', titulo: 'Cálculo', autor: 'Stewart', categoria: 'Basicas', disponibles: 1, anioCursada: 3 });
    req.flush({ id: '9780000000001' });
    expect(page.modalMsg).toBe('¡Libro añadido exitosamente!');
    page.cerrarModal();
    expect(navigate).toHaveBeenCalledWith(['/home-admin']);
  });

  it('stays on the form and reports an error when saving fails', () => {
    page.libro.isbn = '9780000000002'; page.libro.titulo = 'X'; page.libro.autor = 'Y'; page.categoriaSeleccionada = 'Basicas';
    page.guardar();
    ctrl.expectOne(`${API}/books/`).flush({}, { status: 400, statusText: 'Bad Request' });
    expect(page.modalMsg).toContain('ISBN');
    page.cerrarModal();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('stores the uploaded cover URL returned by the API', () => {
    page.onImagenSeleccionada({ target: { files: [new File(['x'], 'c.png', { type: 'image/png' })] } } as unknown as Event);
    ctrl.expectOne(`${API}/books/upload-image/`).flush({ url: 'data:image/png;base64,eA==' });
    expect(page.libro.imagen).toBe('data:image/png;base64,eA==');
  });
});

describe('BookEdit study year', () => {
  it('loads the saved year and sends the selected year on update', () => {
    TestBed.configureTestingModule({ imports: [BookEdit], providers: testProviders });
    const fixture = TestBed.createComponent(BookEdit);
    const page = fixture.componentInstance;
    const ctrl = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    ctrl.expectOne(`${API}/books//`).flush({ isbn: '9781', titulo: 'Libro', autor: 'Autor', categoria: 'Basicas', anioCursada: 2 });
    expect(page.libro.anioCursada).toBe(2);
    fixture.detectChanges(false);
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('select[aria-label="Año de cursada"]');
    const option = Array.from(select.options).find(o => o.textContent?.includes('4.º'))!;
    select.value = option.value;
    select.dispatchEvent(new Event('change'));
    expect(page.libro.anioCursada).toBe(4);
    page.guardar();
    const req = ctrl.expectOne(`${API}/books//`);
    expect(req.request.body.anioCursada).toBe(4);
    req.flush({});
    ctrl.verify();
  });
});

describe('BookEdit copies', () => {
  const load = () => {
    TestBed.configureTestingModule({ imports: [BookEdit], providers: testProviders });
    const fixture = TestBed.createComponent(BookEdit);
    const ctrl = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    ctrl.expectOne(`${API}/books//`).flush({
      isbn: '9781', titulo: 'L', autor: 'A', categoria: 'Basicas', disponibles: 1,
      ejemplares: [{ id: 'E-1', estado: 'disponible', observaciones: '', isbn: '9781' },
                   { id: 'E-2', estado: 'prestado', observaciones: '', isbn: '9781' }] });
    fixture.detectChanges(false);
    fixture.detectChanges(false);  // la categoría se asigna al cargar; hace falta una segunda pasada
    return { fixture, page: fixture.componentInstance, ctrl };
  };
  const chips = (f: { nativeElement: HTMLElement }) => Array.from(f.nativeElement.querySelectorAll<HTMLButtonElement>('button.ejemplar'));
  const estadoSelect = (f: { nativeElement: HTMLElement }) => f.nativeElement.querySelector<HTMLSelectElement>('#estadoEjemplar')!;

  it('selects a copy by clicking its name and only then enables the state selector', async () => {
    const { fixture, page } = load();
    await fixture.whenStable();
    fixture.detectChanges(false);
    expect(chips(fixture).map(c => c.textContent?.trim())).toEqual(['E-1 · Disponible', 'E-2 · Prestado']);
    expect(estadoSelect(fixture).disabled).toBe(true);
    chips(fixture)[0].click();
    fixture.detectChanges(false);
    await fixture.whenStable();
    expect(page.ejemplarSeleccionado).toBe('E-1');
    expect(chips(fixture)[0].classList).toContain('seleccionado');
    expect(estadoSelect(fixture).disabled).toBe(false);
  });

  it('toggles the selected copy between available and not available and recounts the stock', () => {
    const { page, ctrl } = load();
    page.seleccionarEjemplar('E-1');
    page.cambiarEstadoEjemplar('baja');
    const off = ctrl.expectOne(`${API}/copies/E-1/`);
    expect(off.request.method).toBe('PATCH');
    expect(off.request.body).toEqual({ estado: 'baja' });
    off.flush({ id: 'E-1', estado: 'baja', observaciones: '', isbn: '9781' });
    expect(page.ejemplarActual?.estado).toBe('baja');
    expect(page.etiquetaEstado('baja')).toBe('No disponible');
    expect(page.libro.disponibles).toBe(0);
    page.cambiarEstadoEjemplar('disponible');
    ctrl.expectOne(`${API}/copies/E-1/`).flush({ id: 'E-1', estado: 'disponible', observaciones: '', isbn: '9781' });
    expect(page.libro.disponibles).toBe(1);
    ctrl.verify();
  });

  it('never changes a lent copy and sends nothing without a selection', () => {
    const { page, ctrl } = load();
    page.cambiarEstadoEjemplar('baja');
    page.seleccionarEjemplar('E-2');
    page.cambiarEstadoEjemplar('baja');
    page.cambiarEstadoEjemplar('disponible');
    ctrl.expectNone(r => r.url.includes('/copies/'));
    expect(page.ejemplarActual?.estado).toBe('prestado');
    ctrl.verify();
  });

  it('keeps the previous state and warns when the change is refused', () => {
    const { page, ctrl } = load();
    page.seleccionarEjemplar('E-1');
    page.cambiarEstadoEjemplar('baja');
    ctrl.expectOne(`${API}/copies/E-1/`).flush({}, { status: 403, statusText: 'Forbidden' });
    expect(page.ejemplarActual?.estado).toBe('disponible');
    expect(page.modal).toBe(true);
    expect(page.guardandoEstado).toBe(false);
  });
});

describe('BookManagement screen', () => {
  const create = () => {
    TestBed.configureTestingModule({ imports: [BookManagement], providers: testProviders });
    const page = TestBed.createComponent(BookManagement).componentInstance;
    page.libros = [
      { id: '9781', isbn: '9781', titulo: 'Álgebra Lineal', autor: 'Grossman', categoria: 'Basicas' },
      { id: '9782', isbn: '9782', titulo: 'Redes', autor: 'Tanenbaum', categoria: 'Sistemas' }];
    return page;
  };

  it('filters by title, author, ISBN or category, ignoring case', () => {
    const page = create();
    expect(page.librosFiltrados).toHaveLength(2);
    page.busqueda = 'tanen';
    expect(page.librosFiltrados.map(l => l.id)).toEqual(['9782']);
    page.busqueda = 'BASICAS';
    expect(page.librosFiltrados.map(l => l.id)).toEqual(['9781']);
    page.busqueda = '9782';
    expect(page.librosFiltrados.map(l => l.id)).toEqual(['9782']);
    page.busqueda = 'zzz';
    expect(page.librosFiltrados).toEqual([]);
  });

  it('does not delete without confirmation and warns when the API refuses', () => {
    const page = create();
    const ctrl = TestBed.inject(HttpTestingController);
    const confirm = vi.spyOn(window, 'confirm');
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    confirm.mockReturnValueOnce(false);
    page.eliminarLibro('9781');
    ctrl.expectNone(`${API}/books/9781/`);
    confirm.mockReturnValueOnce(true);
    page.eliminarLibro('9781');
    ctrl.expectOne(`${API}/books/9781/`).flush(['historial'], { status: 400, statusText: 'Bad Request' });
    expect(alertSpy).toHaveBeenCalledWith('Error al eliminar el libro');
  });

  it('opens the edit screen', () => {
    const page = create();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    page.editarLibro('9782');
    expect(navigate).toHaveBeenCalledWith(['/book-edit', '9782']);
  });
});

describe('BookDetail screen', () => {
  it('starts a reservation for the shown book', () => {
    TestBed.configureTestingModule({ imports: [BookDetail], providers: testProviders });
    const page = TestBed.createComponent(BookDetail).componentInstance;
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    page.solicitarPrestamo();
    expect(navigate).not.toHaveBeenCalled();
    page.libro = { id: '9780000000012', isbn: '9780000000012', titulo: 'T', autor: '', categoria: 'Basicas' };
    page.solicitarPrestamo();
    expect(navigate).toHaveBeenCalledWith(['/loan-request', '9780000000012']);
  });
});

describe('HomeUser screen (catalog)', () => {
  let page: HomeUser;
  let ctrl: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HomeUser], providers: testProviders });
    page = TestBed.createComponent(HomeUser).componentInstance;
    ctrl = TestBed.inject(HttpTestingController);
  });
  afterEach(() => ctrl.verify());

  it('opens the "Basicas" category first and groups its books by year', () => {
    page.ngOnInit();
    ctrl.expectOne(`${API}/books/?categoria=Basicas`).flush([
      { id: '1', titulo: 'A', anioCursada: 2 }, { id: '2', titulo: 'B', anioCursada: 1 }, { id: '3', titulo: 'C', anioCursada: 2 }, { id: '4', titulo: 'D', anioCursada: 0 }]);
    expect(page.catActiva).toBe('Basicas');
    expect(page.gruposPorAnio.map(g => [g.anio, g.libros.length])).toEqual([[0, 1], [1, 1], [2, 2]]);
  });

  it('clears the list when the category request fails', () => {
    page.filtrar('Sistemas');
    ctrl.expectOne(`${API}/books/?categoria=Sistemas`).flush({}, { status: 500, statusText: 'err' });
    expect(page.libros).toEqual([]);
    expect(page.gruposPorAnio).toEqual([]);
  });

  it('labels each study year', () => {
    expect(page.etiquetaAnio(0)).toBe('General');
    expect(page.etiquetaAnio(99)).toBe('Electivas');
    expect(page.etiquetaAnio(1)).toBe('1er Año');
    expect(page.etiquetaAnio(3)).toBe('3er Año');
  });

  it('opens a book detail', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    page.verLibro('9780000000008');
    expect(navigate).toHaveBeenCalledWith(['/book', '9780000000008']);
  });
});
