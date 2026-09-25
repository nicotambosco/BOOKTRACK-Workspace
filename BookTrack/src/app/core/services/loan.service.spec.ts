import { HttpClient } from '@angular/common/http';
import { firstValueFrom, of } from 'rxjs';
import { LoanService } from './loan.service';

describe('LoanService', () => {
  it('sends the selected loan dates', async () => {
    const post = vi.fn().mockReturnValue(of({ id: 1 }));
    const service = new LoanService({ post } as unknown as HttpClient);

    await firstValueFrom(service.request(7, '2026-09-25', '2026-10-02'));

    expect(post).toHaveBeenCalledWith('http://127.0.0.1:8000/api/loans/', {
      libroId: 7,
      plazoDeSolicitud: '2026-09-25 a 2026-10-02',
      tipoPrestamo: 'normal',
      fechaInicio: '2026-09-25',
      fechaFin: '2026-10-02',
    });
  });
});
