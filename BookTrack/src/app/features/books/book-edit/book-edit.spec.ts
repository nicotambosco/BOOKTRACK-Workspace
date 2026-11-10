import { ComponentFixture, TestBed } from '@angular/core/testing';
import { testProviders } from '../../../testing/test-providers';

import { BookEdit } from './book-edit';

describe('BookEdit', () => {
  let component: BookEdit;
  let fixture: ComponentFixture<BookEdit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookEdit],
      providers: testProviders,
    }).compileComponents();

    fixture = TestBed.createComponent(BookEdit);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
