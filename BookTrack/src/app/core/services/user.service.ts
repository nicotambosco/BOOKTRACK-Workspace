import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../../models/user.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UserService {
  private api = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<User[]> {
    return this.http.get<User[]>(`${this.api}/`);
  }

  getById(id: number): Observable<User> {
    return this.http.get<User>(`${this.api}/${id}/`);
  }

  getProfile(): Observable<User> {
    return this.http.get<User>(`${this.api}/me/`);
  }

  create(user: User): Observable<User> {
    return this.http.post<User>(`${this.api}/register/`, user);
  }

  update(id: number, user: Partial<User>): Observable<User> {
    return this.http.patch<User>(`${this.api}/${id}/`, user);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}/`);
  }
}
