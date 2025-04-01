import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectedMembersDialogComponent } from './selected-members-dialog.component';


import { MatDialogRef , MAT_DIALOG_DATA } from '@angular/material/dialog';
describe('SelectedMembersDialogComponent', () => {
  let component: SelectedMembersDialogComponent;
  let fixture: ComponentFixture<SelectedMembersDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectedMembersDialogComponent],
       providers: [
              // Minimaler Mock-DialogRef
              { provide: MatDialogRef, useValue: {} },
              { provide: MAT_DIALOG_DATA, useValue: { /* beliebige Mock-Daten */ } }
            ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SelectedMembersDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
