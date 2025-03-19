import { TestBed } from '@angular/core/testing';

import { UserService } from './user.service';
import { Firestore } from '@angular/fire/firestore';
import { Storage } from '@angular/fire/storage';

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: Firestore, useValue: {} }, // Falls dein ChannelService das auch braucht
        { provide: Storage, useValue: {} }    // Mock-Objekt als Platzhalter
      ]
    });
    service = TestBed.inject(UserService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
