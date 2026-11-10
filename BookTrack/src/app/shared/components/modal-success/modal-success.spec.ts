import { ComponentFixture, TestBed } from '@angular/core/testing';
import { testProviders } from '../../../testing/test-providers';

import { ModalSuccess } from './modal-success';

describe('ModalSuccess', () => {
  let component: ModalSuccess;
  let fixture: ComponentFixture<ModalSuccess>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalSuccess],
      providers: testProviders,
    }).compileComponents();

    fixture = TestBed.createComponent(ModalSuccess);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
