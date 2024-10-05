import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditChannelDialogComponent } from './edit-channel-dialog.component';

describe('EditChannelDialogComponent', () => {
  let component: EditChannelDialogComponent;
  let fixture: ComponentFixture<EditChannelDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditChannelDialogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EditChannelDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
