import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ActividadBibliotecario, Bibliotecario, NuevoBibliotecario, Persona } from '../../models/librarian.model';

/** Solo para el rol admin. Contrato del backend en docs/ADMIN_BIBLIOTECARIOS.md. */
@Injectable({ providedIn: 'root' })
export class LibrarianService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/librarians`;

  getAll(): Observable<Bibliotecario[]> { return this.http.get<Bibliotecario[]>(`${this.api}/`); }
  create(b: NuevoBibliotecario): Observable<Bibliotecario> { return this.http.post<Bibliotecario>(`${this.api}/`, b); }
  update(id: string, b: Partial<Pick<Bibliotecario, 'nombreApellido' | 'email' | 'activo'>>): Observable<Bibliotecario> {
    return this.http.patch<Bibliotecario>(`${this.api}/${id}/`, b);
  }
  people(): Observable<Persona[]> { return this.http.get<Persona[]>(`${environment.apiUrl}/roles/`); }
  setNivel(legajo: string, nivel: number): Observable<Persona> { return this.http.patch<Persona>(`${environment.apiUrl}/roles/${legajo}/`, { nivel }); }
  activity(id: string): Observable<ActividadBibliotecario[]> { return this.http.get<ActividadBibliotecario[]>(`${this.api}/${id}/activity/`); }
}
