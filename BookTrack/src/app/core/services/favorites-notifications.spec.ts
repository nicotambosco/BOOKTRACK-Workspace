import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { FavoriteService } from './favorite.service';
import { NotificationService } from './notification.service';
import { environment } from '../../../environments/environment';
import { testProviders } from '../../testing/test-providers';

const API = environment.apiUrl;

describe('Favorites and notifications services (contract with the API)', () => {
  let ctrl: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: testProviders });
    ctrl = TestBed.inject(HttpTestingController);
  });
  afterEach(() => ctrl.verify());

  it('lists, adds and removes favorites by ISBN', () => {
    const s = TestBed.inject(FavoriteService);
    s.getAll().subscribe(); s.add('9780000000001').subscribe(); s.remove('9780000000001').subscribe();
    const reqs = ctrl.match(() => true);
    expect(reqs.map(r => `${r.request.method} ${r.request.url}`)).toEqual([
      `GET ${API}/favorites/`, `POST ${API}/favorites/`, `DELETE ${API}/favorites/9780000000001/`]);
    expect(reqs[1].request.body).toEqual({ isbn: '9780000000001' });
    reqs.forEach(r => r.flush({}));
  });

  it('reads the notifications of the signed-in user', () => {
    TestBed.inject(NotificationService).getAll().subscribe();
    const req = ctrl.expectOne(`${API}/notifications/`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});
