import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MemberSectionDialogComponent } from './member-section-dialog.component';


import { MatDialogRef , MAT_DIALOG_DATA } from '@angular/material/dialog';

describe('MemberSectionDialogComponent', () => {
  let component: MemberSectionDialogComponent;
  let fixture: ComponentFixture<MemberSectionDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MemberSectionDialogComponent],


     providers: [
        // Minimaler Mock-DialogRef
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: { /* beliebige Mock-Daten */ } }
      ]
      
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MemberSectionDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
