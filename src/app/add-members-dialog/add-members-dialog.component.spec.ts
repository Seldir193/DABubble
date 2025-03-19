import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddMembersDialogComponent } from './add-members-dialog.component';
import { appConfig } from '../app.config';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

describe('AddMembersDialogComponent', () => {
  let component: AddMembersDialogComponent;
  let fixture: ComponentFixture<AddMembersDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddMembersDialogComponent],
      providers: [                      
                  { provide: MatDialogRef, useValue: {} },
                  { provide: MAT_DIALOG_DATA, useValue: { } },
                     ...appConfig.providers
                  ],
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AddMembersDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
