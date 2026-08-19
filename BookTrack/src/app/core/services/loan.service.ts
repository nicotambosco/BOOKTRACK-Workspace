import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Loan } from '../../models/loan.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class LoanService {
  private api = `${environment.apiUrl}/loans`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Loan[]> {
    return this.http.get<Loan[]>(`${this.api}/`);
  }

  getPending(): Observable<Loan[]> {
    return this.http.get<Loan[]>(`${this.api}/`, { params: { estado: 'pendiente' } });
  }

  approve(id: number): Observable<Loan> {
    return this.http.patch<Loan>(`${this.api}/${id}/aprobar/`, {});
  }

  deny(id: number): Observable<Loan> {
    return this.http.patch<Loan>(`${this.api}/${id}/denegar/`, {});
  }

  request(libroId: number, plazoDeSolicitud: string, estudianteId: number): Observable<Loan> {
    return this.http.post<Loan>(`${this.api}/`, {
      libroId,
      plazoDeSolicitud,
      estudianteId,
      tipoPrestamo: 'normal',
      fechaFin: null,
    });
  }

  getHistory(): Observable<Loan[]> {
    return this.http.get<Loan[]>(`${this.api}/`);
  }

  exportPDF(): Observable<Blob> {
    return this.http.get(`${this.api}/export/pdf/`, { responseType: 'blob' });
  }

  exportExcel(): Observable<Blob> {
    return this.http.get(`${this.api}/export/excel/`, { responseType: 'blob' });
  }
}
