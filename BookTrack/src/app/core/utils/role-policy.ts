import { Rol } from '../../models/user.model';

export const ROLE_RANK: Record<Rol, number> = { usuario: 0, bibliotecario: 1, admin: 2 };
export const ROLE_OPTIONS: { clave: Rol; nombre: string; descripcion: string }[] = [
  { clave: 'usuario', nombre: 'Usuario', descripcion: 'Reservar libros y consultar sus préstamos.' },
  { clave: 'bibliotecario', nombre: 'Bibliotecario', descripcion: 'Gestionar libros, reservas y devoluciones.' },
  { clave: 'admin', nombre: 'Administrador', descripcion: 'Administrar las cuentas y sus roles.' },
];

export function rolePolicy(actorId: string | null, actorRoles: readonly Rol[], targetId: string,
                           targetRoles: readonly Rol[], fixedRoles: readonly Rol[] = []) {
  const principal = actorId === 'ADMIN-1' && actorRoles.includes('admin');
  const propio = actorId === targetId;
  const rango = Math.max(-1, ...actorRoles.map(r => ROLE_RANK[r]));
  const asignables = ROLE_OPTIONS.filter(r => !targetRoles.includes(r.clave) &&
    (principal || (!propio && actorRoles.includes('admin') && ROLE_RANK[r.clave] < rango))).map(r => r.clave);
  const quitables = targetRoles.filter(r => !fixedRoles.includes(r) &&
    (principal || ((propio || actorRoles.includes('admin')) && ROLE_RANK[r] < rango)));
  return { asignables, quitables,
    bloqueadosParaAgregar: ROLE_OPTIONS.filter(r => !targetRoles.includes(r.clave) && !asignables.includes(r.clave)).map(r => r.clave),
    bloqueadosParaQuitar: targetRoles.filter(r => !quitables.includes(r)) };
}
