import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { fakeJwt, testProviders } from '../../../testing/test-providers';
import { RoleSwitcher } from './role-switcher';

describe('Selector de vista', () => {
  beforeEach(() => {
    localStorage.clear(); sessionStorage.clear();
    TestBed.configureTestingModule({ imports: [RoleSwitcher], providers: testProviders });
  });
  afterEach(() => { localStorage.clear(); sessionStorage.clear(); });

  it('ofrece ambas vistas y navega al panel del rol elegido', () => {
    sessionStorage.setItem('auth_token', fakeJwt({ categoria: 'admin', roles: ['admin', 'bibliotecario'] }));
    const fixture = TestBed.createComponent(RoleSwitcher);
    fixture.detectChanges();
    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    expect(Array.from(select.options).map(o => o.textContent?.trim())).toEqual(['Administrador', 'Bibliotecario']);
    expect(select.value).toBe('admin');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    select.value = 'bibliotecario';
    select.dispatchEvent(new Event('change'));
    expect(navigate).toHaveBeenCalledWith(['/home-bibliotecario']);
  });

  it('oculta el selector cuando hay un solo rol', () => {
    sessionStorage.setItem('auth_token', fakeJwt({ categoria: 'usuario', roles: ['usuario'] }));
    const fixture = TestBed.createComponent(RoleSwitcher);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('select')).toBeNull();
  });

  it('selecciona la vista admin aunque bibliotecario sea la primera opción', () => {
    sessionStorage.setItem('auth_token', fakeJwt({ categoria: 'admin', roles: ['bibliotecario', 'admin'] }));
    const fixture = TestBed.createComponent(RoleSwitcher);
    fixture.detectChanges();
    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    expect(select.value).toBe('admin');
  });
});
