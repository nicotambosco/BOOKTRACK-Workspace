import { HttpClient } from '@angular/common/http';
import { firstValueFrom, of } from 'rxjs';
import { LoanService } from './loan.service';

describe('LoanService lifecycle actions', () => {
  it('records returns and extensions through actions, without sending a writable state', async () => {
    const patch = vi.fn().mockReturnValue(of({ id: 5, estado: 'devuelto' }));
    const service = new LoanService({ patch } as unknown as HttpClient);
    await firstValueFrom(service.return_(5));
    await firstValueFrom(service.requestExtension(5));
    expect(patch.mock.calls).toEqual([
      ['http://127.0.0.1:8000/api/loans/5/devolver/', {}],
      ['http://127.0.0.1:8000/api/loans/5/solicitar-extension/', {}],
    ]);
  });

  it('exports the selected state from the API', async () => {
    const get = vi.fn().mockReturnValue(of(new Blob()));
    const service = new LoanService({ get } as unknown as HttpClient);
    await firstValueFrom(service.exportExcel('vencido'));
    expect(get).toHaveBeenCalledWith('http://127.0.0.1:8000/api/loans/export/excel/', {
      responseType: 'blob', params: { estado: 'vencido' },
    });
  });
});
