import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { testProviders } from './testing/test-providers';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [App], providers: testProviders }).compileComponents();
  });

  it('should create the app', () => {
    expect(TestBed.createComponent(App).componentInstance).toBeTruthy();
  });

  it('renders the router outlet that hosts every screen', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('router-outlet')).not.toBeNull();
  });
});
