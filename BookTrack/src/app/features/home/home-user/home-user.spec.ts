import { ComponentFixture, TestBed } from '@angular/core/testing';
import { testProviders } from '../../../testing/test-providers';

import { HomeUser } from './home-user';

describe('HomeUser', () => {
  let component: HomeUser;
  let fixture: ComponentFixture<HomeUser>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeUser],
      providers: testProviders,
    }).compileComponents();

    fixture = TestBed.createComponent(HomeUser);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
