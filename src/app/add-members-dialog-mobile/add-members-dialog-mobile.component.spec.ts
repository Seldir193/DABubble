import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddMembersDialogMobileComponent } from './add-members-dialog-mobile.component';

describe('AddMembersDialogMobileComponent', () => {
  let component: AddMembersDialogMobileComponent;
  let fixture: ComponentFixture<AddMembersDialogMobileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddMembersDialogMobileComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AddMembersDialogMobileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
