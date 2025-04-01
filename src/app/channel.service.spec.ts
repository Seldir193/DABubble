import { TestBed } from '@angular/core/testing';

import { ChannelService } from './channel.service';
import { Firestore } from '@angular/fire/firestore';
import { Storage } from '@angular/fire/storage';

describe('ChannelService', () => {
  let service: ChannelService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        // Minimaler Mock, damit der Injector Firestore findet
        { provide: Firestore, useValue: {} },
        { provide: Storage, useValue: {} } 
      ]
    });
    service = TestBed.inject(ChannelService);
    
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
