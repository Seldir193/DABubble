import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PasswortResetComponent } from './passwort-reset.component';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { appConfig } from '../app.config';

describe('PasswortResetComponent', () => {
  let component: PasswortResetComponent;
  let fixture: ComponentFixture<PasswortResetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PasswortResetComponent],
      providers: [                      
                    { provide: MatDialogRef, useValue: {} },
                    { provide: MAT_DIALOG_DATA, useValue: { } },
                      ...appConfig.providers
                     ],
          
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PasswortResetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
