import { ComponentFixture, TestBed } from '@angular/core/testing';
import { testProviders } from '../../../testing/test-providers';

import { ModalError } from './modal-error';

describe('ModalError', () => {
  let component: ModalError;
  let fixture: ComponentFixture<ModalError>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalError],
      providers: testProviders,
    }).compileComponents();

    fixture = TestBed.createComponent(ModalError);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
