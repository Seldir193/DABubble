import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChannelDialogComponent } from './channel-dialog.component';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { appConfig } from '../app.config';


describe('ChannelDialogComponent', () => {
  let component: ChannelDialogComponent;
  let fixture: ComponentFixture<ChannelDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChannelDialogComponent],
       providers: [
                    // Minimaler Mock-DialogRef
                    { provide: MatDialogRef, useValue: {} },
                    { provide: MAT_DIALOG_DATA, useValue: { /* beliebige Mock-Daten */ } },
                     ...appConfig.providers
                  ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ChannelDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
