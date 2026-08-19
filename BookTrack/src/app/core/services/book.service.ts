import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Book } from '../../models/book.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class BookService {
  private api = `${environment.apiUrl}/books`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Book[]> {
    return this.http.get<Book[]>(`${this.api}/`);
  }

  getById(id: number): Observable<Book> {
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

  update(id: number, book: Book): Observable<Book> {
    return this.http.put<Book>(`${this.api}/${id}/`, book);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}/`);
  }

  uploadImage(_file: File): Observable<{ url: string }> {
    // ponytail: placeholder hasta implementar file upload en Django
    return new Observable(obs => { obs.next({ url: 'assets/images/placeholder-book.jpg' }); obs.complete(); });
  }
}
