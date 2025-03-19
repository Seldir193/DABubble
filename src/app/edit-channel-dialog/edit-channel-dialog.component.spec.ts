import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditChannelDialogComponent } from './edit-channel-dialog.component';
import { appConfig } from '../app.config';


import { MAT_DIALOG_DATA, MatDialogRef  } from '@angular/material/dialog';
describe('EditChannelDialogComponent', () => {
  let component: EditChannelDialogComponent;
  let fixture: ComponentFixture<EditChannelDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditChannelDialogComponent],
      providers: [
                   // Minimaler Mock-DialogRef
                   { provide: MatDialogRef, useValue: {} },
                   { provide: MAT_DIALOG_DATA, useValue: { /* beliebige Mock-Daten */ } },
                   ...appConfig.providers
                 ],
                 
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EditChannelDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
