import { ComponentFixture, TestBed } from '@angular/core/testing';
import { testProviders } from '../../../testing/test-providers';

import { ProfileAdmin } from './profile-admin';

describe('ProfileAdmin', () => {
  let component: ProfileAdmin;
  let fixture: ComponentFixture<ProfileAdmin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileAdmin],
      providers: testProviders,
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileAdmin);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
