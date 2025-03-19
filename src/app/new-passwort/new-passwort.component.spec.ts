import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { NewPasswortComponent } from './new-passwort.component';
import { appConfig } from '../app.config';

describe('NewPasswortComponent', () => {
  let component: NewPasswortComponent;
  let fixture: ComponentFixture<NewPasswortComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewPasswortComponent],
      providers: [
        { provide: Auth, useValue: {} },
         ...appConfig.providers
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(NewPasswortComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
