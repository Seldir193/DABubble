import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MembersDialogComponent } from './members-dialog.component';

describe('MitgliederDialogComponent', () => {
  let component: MembersDialogComponent;
  let fixture: ComponentFixture<MembersDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MembersDialogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MembersDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
