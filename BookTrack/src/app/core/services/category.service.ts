import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Category } from '../../models/category.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private api = `${environment.apiUrl}/categories`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.api}/`);
  }

  add(nombre: string): Observable<Category> {
    return this.http.post<Category>(`${this.api}/`, { nombre });
  }

  edit(id: number, nombre: string): Observable<Category> {
    return this.http.patch<Category>(`${this.api}/${id}/`, { nombre });
  }
}
