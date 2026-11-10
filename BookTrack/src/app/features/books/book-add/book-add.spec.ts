import { ComponentFixture, TestBed } from '@angular/core/testing';
import { testProviders } from '../../../testing/test-providers';

import { BookAdd } from './book-add';

describe('BookAdd', () => {
  let component: BookAdd;
  let fixture: ComponentFixture<BookAdd>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookAdd],
      providers: testProviders,
    }).compileComponents();

    fixture = TestBed.createComponent(BookAdd);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
