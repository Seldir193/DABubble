import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InnerChannelComponent } from './inner-channel.component';
import { Firestore } from '@angular/fire/firestore';
import { appConfig } from '../app.config';

describe('InnerChannelComponent', () => {
  let component: InnerChannelComponent;
  let fixture: ComponentFixture<InnerChannelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InnerChannelComponent],
      providers: [
        { provide: Firestore, useValue: {} }, 
         ...appConfig.providers
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(InnerChannelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
