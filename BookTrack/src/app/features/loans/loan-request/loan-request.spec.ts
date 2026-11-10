import { ComponentFixture, TestBed } from '@angular/core/testing';
import { testProviders } from '../../../testing/test-providers';

import { LoanRequest } from './loan-request';

describe('LoanRequest', () => {
  let component: LoanRequest;
  let fixture: ComponentFixture<LoanRequest>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoanRequest],
      providers: testProviders,
    }).compileComponents();

    fixture = TestBed.createComponent(LoanRequest);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
