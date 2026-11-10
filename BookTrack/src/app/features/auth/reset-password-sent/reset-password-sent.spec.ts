import { ComponentFixture, TestBed } from '@angular/core/testing';
import { testProviders } from '../../../testing/test-providers';

import { ResetPasswordSent } from './reset-password-sent';

describe('ResetPasswordSent', () => {
  let component: ResetPasswordSent;
  let fixture: ComponentFixture<ResetPasswordSent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResetPasswordSent],
      providers: testProviders,
    }).compileComponents();

    fixture = TestBed.createComponent(ResetPasswordSent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
