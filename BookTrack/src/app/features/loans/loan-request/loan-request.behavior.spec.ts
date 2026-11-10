import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { HttpTestingController } from '@angular/common/http/testing';
import { LoanRequest } from './loan-request';
import { environment } from '../../../../environments/environment';
import { testProviders } from '../../../testing/test-providers';

const iso = (offsetDays: number) => {
  const d = new Date(); d.setDate(d.getDate() + offsetDays);
  return d.toLocaleDateString('en-CA');
};

describe('LoanRequest screen (create reservation)', () => {
  let page: LoanRequest;
  let ctrl: HttpTestingController;
  const URL = `${environment.apiUrl}/reservations/`;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [LoanRequest], providers: testProviders });
    page = TestBed.createComponent(LoanRequest).componentInstance;
    ctrl = TestBed.inject(HttpTestingController);
    page.bookId = 7;
  });

  it('does not call the API when a date is missing', () => {
    page.enviar();
    ctrl.expectNone(URL);
  });

  it('rejects a pickup date in the past', () => {
    page.desde = iso(-1); page.hasta = iso(3);
    page.enviar();
    expect(page.error).toBe('Revisá las fechas de retiro y devolución.');
    ctrl.expectNone(URL);
  });

  it('rejects a return date before the pickup date', () => {
    page.desde = iso(5); page.hasta = iso(2);
    page.enviar();
    expect(page.error).toBe('Revisá las fechas de retiro y devolución.');
    ctrl.expectNone(URL);
  });

  it('creates the reservation with the contract expected by the API', () => {
    page.desde = iso(1); page.hasta = iso(8);
    page.enviar();
    const req = ctrl.expectOne(URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ libroId: 7, fechaVencimiento: iso(1), fechaDevolucionPrevista: iso(8) });
    req.flush({ id: 1, estado: 'activa' });
    expect(page.exito).toBe(true);
    expect(page.enviando).toBe(false);
  });

  it('explains the failure and allows retrying when the API refuses (e.g. duplicate active reservation)', () => {
    page.desde = iso(1); page.hasta = iso(8);
    page.enviar();
    ctrl.expectOne(URL).flush(['Ya tenés una reserva activa para este libro.'], { status: 400, statusText: 'Bad Request' });
    expect(page.exito).toBe(false);
    expect(page.enviando).toBe(false);
    expect(page.error).toContain('No se pudo crear la reserva');
  });

  it('goes to the personal history after confirming and back to the book on cancel', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    page.continuar(); page.volver();
    expect(navigate).toHaveBeenCalledWith(['/user-history']);
    expect(navigate).toHaveBeenCalledWith(['/book', 7]);
  });
});
