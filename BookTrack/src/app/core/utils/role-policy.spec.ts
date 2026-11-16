import { rolePolicy } from './role-policy';

describe('Jerarquía de rangos', () => {
  it('bibliotecario solo puede quitarse usuario y no puede asignarse rangos', () => {
    const p = rolePolicy('B', ['usuario', 'bibliotecario'], 'B', ['usuario', 'bibliotecario']);
    expect(p.quitables).toEqual(['usuario']);
    expect(p.asignables).toEqual([]);
    expect(p.bloqueadosParaAgregar).toContain('admin');
  });
  it('admin conserva admin y puede quitarse los dos rangos inferiores', () => {
    const p = rolePolicy('A', ['usuario', 'bibliotecario', 'admin'], 'A', ['usuario', 'bibliotecario', 'admin']);
    expect(p.quitables).toEqual(['usuario', 'bibliotecario']);
    expect(p.bloqueadosParaQuitar).toEqual(['admin']);
    expect(p.asignables).toEqual([]);
  });
  it('admin normal no puede asignar ni quitar admin a otra persona', () => {
    expect(rolePolicy('A', ['admin'], 'B', ['bibliotecario']).asignables).not.toContain('admin');
    expect(rolePolicy('A', ['admin'], 'B', ['bibliotecario', 'admin']).quitables).toEqual(['bibliotecario']);
  });
  it('el fijo puede administrar todos los rangos y mantiene su admin fijo', () => {
    expect(rolePolicy('ADMIN-1', ['admin'], 'B', ['bibliotecario']).asignables).toContain('admin');
    const p = rolePolicy('ADMIN-1', ['admin'], 'ADMIN-1', ['admin'], ['admin']);
    expect(p.asignables).toEqual(['usuario', 'bibliotecario']);
    expect(p.quitables).toEqual([]);
  });
});
