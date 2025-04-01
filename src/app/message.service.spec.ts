import { TestBed } from '@angular/core/testing';

import { MessageService } from './message.service';
import { Firestore } from '@angular/fire/firestore';
import { Storage } from '@angular/fire/storage';

describe('MessageService', () => {
  let service: MessageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
              { provide: Firestore, useValue: {} }, // Falls dein ChannelService das auch braucht
              { provide: Storage, useValue: {} }    // Mock-Objekt als Platzhalter
            ]
    });
    service = TestBed.inject(MessageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
