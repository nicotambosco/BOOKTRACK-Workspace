import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { testProviders } from '../../../testing/test-providers';
import { ProfileUser } from './profile-user';
import { environment } from '../../../../environments/environment';
const API = environment.apiUrl;
const user = {id:'13885',legajo:'13885',nombreApellido:'Ana Ejemplo',email:'ana@example.test',categoria:'usuario'};
describe('ProfileUser: email-only editing', () => {
  let fixture: ComponentFixture<ProfileUser>;
  let page: ProfileUser;
  let ctrl: HttpTestingController;
  beforeEach(async () => {
    localStorage.clear(); sessionStorage.clear();
    await TestBed.configureTestingModule({imports:[ProfileUser],providers:testProviders}).compileComponents();
    fixture = TestBed.createComponent(ProfileUser);
    page = fixture.componentInstance;
    ctrl = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    ctrl.expectOne(`${API}/users/me/`).flush(user);
    ctrl.expectOne(`${API}/notifications/`).flush([]);
    fixture.detectChanges(false);
    await fixture.whenStable();
  });
  afterEach(() => ctrl.verify());
  it('keeps identity fields read-only while only email becomes editable', async () => {
    page.editando = true; fixture.detectChanges(false); await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector<HTMLInputElement>('#nombrePerfil')!.readOnly).toBe(true);
    expect(root.querySelector<HTMLInputElement>('#legajoPerfil')!.readOnly).toBe(true);
    expect(root.querySelector<HTMLInputElement>('#emailPerfil')!.disabled).toBe(false);
    expect(root.querySelector('input[type="password"]')).toBeNull();
    expect(root.querySelector('input[type="file"]')).toBeNull();
    expect(root.textContent).not.toContain('CONTRASEÑA');
  });
  it('sends only email and shows success only after saving', () => {
    page.editando = true; page.usuario.email = 'nuevo@example.test'; page.guardar(); page.guardar();
    const req = ctrl.expectOne(`${API}/users/13885/`);
    expect(req.request.body).toEqual({email:'nuevo@example.test'});
    expect(page.exito).toBe(false);
    req.flush({...user,email:'nuevo@example.test'});
    expect(page.exito).toBe(true);
    expect(page.guardando).toBe(false);
  });
  it('preserves the edit and shows the API reason on failure', () => {
    page.editando = true; page.usuario.email = 'invalid'; page.guardar();
    ctrl.expectOne(`${API}/users/13885/`).flush({email:['Ingresá un email válido.']},{status:400,statusText:'Error'});
    expect(page.exito).toBe(false);
    expect(page.editando).toBe(true);
    expect(page.errorPerfil).toBe('Ingresá un email válido.');
    expect(page.usuario.email).toBe('invalid');
  });
  it('discards unsaved email changes when leaving editing', () => {
    page.editando = true; page.usuario.email = 'otro@example.test'; page.cancelarEdicion();
    expect(page.usuario.email).toBe(user.email);
    expect(page.editando).toBe(false);
  });
});
