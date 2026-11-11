import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Book } from '../../models/book.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class FavoriteService {
  private api = `${environment.apiUrl}/favorites`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Book[]> {
    return this.http.get<Book[]>(`${this.api}/`);
  }

  add(isbn: string): Observable<Book> {
    return this.http.post<Book>(`${this.api}/`, { isbn });
  }

  remove(isbn: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/${isbn}/`);
  }
}
