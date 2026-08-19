import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CommentService {
  private api = `${environment.apiUrl}/comments`;

  constructor(private http: HttpClient) {}

  send(seccion: string, comentario: string): Observable<void> {
    return this.http.post<void>(`${this.api}/`, { seccion, comentario });
  }
}
