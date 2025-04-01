import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MembersDialogComponent } from './members-dialog.component';
import { appConfig } from '../app.config';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

describe('MitgliederDialogComponent', () => {
  let component: MembersDialogComponent;
  let fixture: ComponentFixture<MembersDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MembersDialogComponent],
      providers: [                      
                  { provide: MatDialogRef, useValue: {} },
                  { provide: MAT_DIALOG_DATA, useValue: { } },
                    ...appConfig.providers
                  ],
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MembersDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
