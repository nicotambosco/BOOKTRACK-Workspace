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

  return_(id: number): Observable<Loan> {
    return this.http.patch<Loan>(`${this.api}/${id}/devolver/`, {});
  }

  requestExtension(id: number): Observable<Loan> {
    return this.http.patch<Loan>(`${this.api}/${id}/solicitar-extension/`, {});
  }

  approveExtension(id: number): Observable<Loan> {
    return this.http.patch<Loan>(`${this.api}/${id}/aprobar-extension/`, {});
  }

  denyExtension(id: number): Observable<Loan> {
    return this.http.patch<Loan>(`${this.api}/${id}/denegar-extension/`, {});
  }

  getHistory(): Observable<Loan[]> {
    return this.http.get<Loan[]>(`${this.api}/`);
  }

  exportPDF(estado?: string): Observable<Blob> {
    return this.http.get(`${this.api}/export/pdf/`, { responseType: 'blob', params: estado ? { estado } : {} });
  }

  exportExcel(estado?: string): Observable<Blob> {
    return this.http.get(`${this.api}/export/excel/`, { responseType: 'blob', params: estado ? { estado } : {} });
  }
}
