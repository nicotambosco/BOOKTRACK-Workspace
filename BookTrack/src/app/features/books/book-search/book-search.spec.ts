import { ComponentFixture, TestBed } from '@angular/core/testing';
import { testProviders } from '../../../testing/test-providers';

import { BookSearch } from './book-search';

describe('BookSearch', () => {
  let component: BookSearch;
  let fixture: ComponentFixture<BookSearch>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookSearch],
      providers: testProviders,
    }).compileComponents();

    fixture = TestBed.createComponent(BookSearch);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
