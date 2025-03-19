import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddMembersDialogMobileComponent } from './add-members-dialog-mobile.component';
import { appConfig } from '../app.config';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

describe('AddMembersDialogMobileComponent', () => {
  let component: AddMembersDialogMobileComponent;
  let fixture: ComponentFixture<AddMembersDialogMobileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddMembersDialogMobileComponent],
      providers: [                      
                   { provide: MatDialogRef, useValue: {} },
                   { provide: MAT_DIALOG_DATA, useValue: { } },
                    ...appConfig.providers
                  ],
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AddMembersDialogMobileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
