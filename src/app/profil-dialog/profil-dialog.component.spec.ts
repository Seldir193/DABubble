import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProfilDialogComponent } from './profil-dialog.component';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { appConfig } from '../app.config';

describe('ProfilDialogComponent', () => {
  let component: ProfilDialogComponent;
  let fixture: ComponentFixture<ProfilDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfilDialogComponent, MatDialogModule],
      providers: [                      
                        { provide: MatDialogRef, useValue: {} },
                        { provide: MAT_DIALOG_DATA, useValue: { } },
                          ...appConfig.providers
                        ],
          })
    .compileComponents();
    
    fixture = TestBed.createComponent(ProfilDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
