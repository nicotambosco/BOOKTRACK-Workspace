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

  request(libroId: string, fechaRetiro: string, fechaVencimiento: string): Observable<Reservation> {
    return this.http.post<Reservation>(`${this.api}/`, { libroId, fechaRetiro, fechaVencimiento });
  }

  cancel(id: number): Observable<Reservation> {
    return this.http.patch<Reservation>(`${this.api}/${id}/cancelar/`, {});
  }

  pickUp(id: number, ejemplarId: string): Observable<Reservation> {
    return this.http.patch<Reservation>(`${this.api}/${id}/retirar/`, { ejemplarId });
  }


}
