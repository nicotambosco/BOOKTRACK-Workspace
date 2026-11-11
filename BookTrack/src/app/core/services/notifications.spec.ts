import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { NotificationService } from './notification.service';
import { environment } from '../../../environments/environment';
import { testProviders } from '../../testing/test-providers';

const API = environment.apiUrl;

describe('Notifications service (contract with the API)', () => {
  let ctrl: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: testProviders });
    ctrl = TestBed.inject(HttpTestingController);
  });
  afterEach(() => ctrl.verify());

  it('reads the notifications of the signed-in user', () => {
    TestBed.inject(NotificationService).getAll().subscribe();
    const req = ctrl.expectOne(`${API}/notifications/`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});
