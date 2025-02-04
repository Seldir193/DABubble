import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectedMembersDialogComponent } from './selected-members-dialog.component';

describe('SelectedMembersDialogComponent', () => {
  let component: SelectedMembersDialogComponent;
  let fixture: ComponentFixture<SelectedMembersDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectedMembersDialogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SelectedMembersDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
