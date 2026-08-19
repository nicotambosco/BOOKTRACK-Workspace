import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoanManagement } from './loan-management';

describe('LoanManagement', () => {
  let component: LoanManagement;
  let fixture: ComponentFixture<LoanManagement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoanManagement],
    }).compileComponents();

    fixture = TestBed.createComponent(LoanManagement);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
