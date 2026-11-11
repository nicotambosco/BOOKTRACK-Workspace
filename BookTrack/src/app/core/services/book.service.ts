import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Book, Ejemplar } from '../../models/book.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class BookService {
  private api = `${environment.apiUrl}/books`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Book[]> {
    return this.http.get<Book[]>(`${this.api}/`);
  }

  getById(id: string): Observable<Book> {
    return this.http.get<Book>(`${this.api}/${id}/`);
  }

  getByCategory(categoria: string): Observable<Book[]> {
    return this.http.get<Book[]>(`${this.api}/`, { params: new HttpParams().set('categoria', categoria) });
  }

  search(query: string): Observable<Book[]> {
    return this.http.get<Book[]>(`${this.api}/`, { params: new HttpParams().set('q', query) });
  }

  create(book: Book): Observable<Book> {
    return this.http.post<Book>(`${this.api}/`, book);
  }

  update(id: string, book: Book): Observable<Book> {
    return this.http.put<Book>(`${this.api}/${id}/`, book);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}/`);
  }

  updateCopyState(id: string, estado: Ejemplar['estado']): Observable<Ejemplar> {
    return this.http.patch<Ejemplar>(`${environment.apiUrl}/copies/${id}/`, { estado });
  }

  uploadImage(file: File): Observable<{ url: string }> {
    const data = new FormData();
    data.append('file', file);
    return this.http.post<{ url: string }>(`${this.api}/upload-image/`, data);
  }
}
