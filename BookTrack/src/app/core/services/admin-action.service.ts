import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AdminAction } from '../../models/admin-action.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AdminActionService {
  private http = inject(HttpClient);
  getAll() { return this.http.get<AdminAction[]>(`${environment.apiUrl}/admin-actions/`); }
}
