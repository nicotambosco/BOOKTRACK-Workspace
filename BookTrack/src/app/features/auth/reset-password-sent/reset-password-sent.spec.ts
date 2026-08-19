import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResetPasswordSent } from './reset-password-sent';

describe('ResetPasswordSent', () => {
  let component: ResetPasswordSent;
  let fixture: ComponentFixture<ResetPasswordSent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResetPasswordSent],
    }).compileComponents();

    fixture = TestBed.createComponent(ResetPasswordSent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
