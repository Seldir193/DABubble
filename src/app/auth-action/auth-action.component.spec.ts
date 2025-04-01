import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthActionComponent } from './auth-action.component';
import { appConfig } from '../app.config';

describe('AuthActionComponent', () => {
  let component: AuthActionComponent;
  let fixture: ComponentFixture<AuthActionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthActionComponent],
      providers: [
        ...appConfig.providers,
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AuthActionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
