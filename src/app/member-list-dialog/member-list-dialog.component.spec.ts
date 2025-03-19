import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MemberListDialogComponent } from './member-list-dialog.component';
import { appConfig } from '../app.config';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

describe('MemberListDialogComponent', () => {
  let component: MemberListDialogComponent;
  let fixture: ComponentFixture<MemberListDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MemberListDialogComponent],
      providers: [
                        
                         { provide: MatDialogRef, useValue: {} },
                         { provide: MAT_DIALOG_DATA, useValue: { } },
                         ...appConfig.providers
                       ],
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MemberListDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
