import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ThreadChannelComponent } from './thread-channel.component';

describe('ThreadChannelComponent', () => {
  let component: ThreadChannelComponent;
  let fixture: ComponentFixture<ThreadChannelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ThreadChannelComponent]
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
