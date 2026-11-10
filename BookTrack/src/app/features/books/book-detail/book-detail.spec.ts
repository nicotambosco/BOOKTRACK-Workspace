import { ComponentFixture, TestBed } from '@angular/core/testing';
import { testProviders } from '../../../testing/test-providers';

import { BookDetail } from './book-detail';

describe('BookDetail', () => {
  let component: BookDetail;
  let fixture: ComponentFixture<BookDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookDetail],
      providers: testProviders,
    }).compileComponents();

    fixture = TestBed.createComponent(BookDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
