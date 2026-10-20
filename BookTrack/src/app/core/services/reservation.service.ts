import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Reservation } from '../../models/reservation.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ReservationService {
  private api = `${environment.apiUrl}/reservations`;
  constructor(private http: HttpClient) {}

  getAll(estado?: Reservation['estado']): Observable<Reservation[]> {
    return this.http.get<Reservation[]>(`${this.api}/`, { params: estado ? { estado } : {} });
  }

  request(libroId: number, fechaVencimiento: string, fechaDevolucionPrevista: string): Observable<Reservation> {
    return this.http.post<Reservation>(`${this.api}/`, { libroId, fechaVencimiento, fechaDevolucionPrevista });
  }

  cancel(id: number): Observable<Reservation> {
    return this.http.patch<Reservation>(`${this.api}/${id}/cancelar/`, {});
  }

  pickUp(id: number): Observable<Reservation> {
    return this.http.patch<Reservation>(`${this.api}/${id}/retirar/`, {});
  }

  prioritize(id: number, prioridad: number): Observable<Reservation> {
    return this.http.patch<Reservation>(`${this.api}/${id}/priorizar/`, { prioridad });
  }
}
