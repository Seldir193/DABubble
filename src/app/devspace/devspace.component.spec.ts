import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DevspaceComponent } from './devspace.component';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { appConfig } from '../app.config';

describe('DevspaceComponent', () => {
  let component: DevspaceComponent;
  let fixture: ComponentFixture<DevspaceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DevspaceComponent],
      providers: [                      
                  { provide: MatDialogRef, useValue: {} },
                  { provide: MAT_DIALOG_DATA, useValue: { } },
                    ...appConfig.providers
                   ],
        
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DevspaceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
