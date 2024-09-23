import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InnerChannelComponent } from './inner-channel.component';

describe('InnerChannelComponent', () => {
  let component: InnerChannelComponent;
  let fixture: ComponentFixture<InnerChannelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InnerChannelComponent]
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
