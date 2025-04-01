import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ThreadChannelComponent } from './thread-channel.component';
import { appConfig } from '../app.config';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

describe('ThreadChannelComponent', () => {
  let component: ThreadChannelComponent;
  let fixture: ComponentFixture<ThreadChannelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ThreadChannelComponent],
        providers: [
                                    
                    { provide: MatDialogRef, useValue: {} },
                    { provide: MAT_DIALOG_DATA, useValue: { } },
                      ...appConfig.providers
                    ],
              
        
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ThreadChannelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
