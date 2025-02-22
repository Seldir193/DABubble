import { TestBed } from '@angular/core/testing';

import { CustomEmojiService } from './custom-emoji.service';

describe('CustomEmojiService', () => {
  let service: CustomEmojiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CustomEmojiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
