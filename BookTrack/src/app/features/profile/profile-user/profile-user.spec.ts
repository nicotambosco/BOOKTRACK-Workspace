import { ComponentFixture, TestBed } from '@angular/core/testing';
import { testProviders } from '../../../testing/test-providers';

import { ProfileUser } from './profile-user';

describe('ProfileUser', () => {
  let component: ProfileUser;
  let fixture: ComponentFixture<ProfileUser>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileUser],
      providers: testProviders,
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileUser);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
