import { HttpClient } from '@angular/common/http';
import { firstValueFrom, of } from 'rxjs';
import { ReservationService } from './reservation.service';

describe('ReservationService', () => {
  it('creates a reservation with separate pickup and return deadlines', async () => {
    const post = vi.fn().mockReturnValue(of({ id: 1, estado: 'activa' }));
    const service = new ReservationService({ post } as unknown as HttpClient);
    await firstValueFrom(service.request(7, '2026-11-01', '2026-11-08'));
    expect(post).toHaveBeenCalledWith('http://127.0.0.1:8000/api/reservations/', {
      libroId: 7, fechaVencimiento: '2026-11-01', fechaDevolucionPrevista: '2026-11-08',
    });
  });

  it('uses dedicated pickup, cancellation and priority actions', async () => {
    const patch = vi.fn().mockReturnValue(of({ id: 4 }));
    const service = new ReservationService({ patch } as unknown as HttpClient);
    await firstValueFrom(service.pickUp(4));
    await firstValueFrom(service.cancel(4));
    await firstValueFrom(service.prioritize(4, 2));
    expect(patch.mock.calls).toEqual([
      ['http://127.0.0.1:8000/api/reservations/4/retirar/', {}],
      ['http://127.0.0.1:8000/api/reservations/4/cancelar/', {}],
      ['http://127.0.0.1:8000/api/reservations/4/priorizar/', { prioridad: 2 }],
    ]);
  });
});
