import { TestBed } from '@angular/core/testing';

import { ThreadChannelService } from './thread-channel.service';

describe('ThreadChannelService', () => {
  let service: ThreadChannelService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThreadChannelService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
