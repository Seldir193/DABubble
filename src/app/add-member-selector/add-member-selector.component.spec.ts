import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddMemberSelectorComponent } from './add-member-selector.component';

describe('AddMemberSelectorComponent', () => {
  let component: AddMemberSelectorComponent;
  let fixture: ComponentFixture<AddMemberSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddMemberSelectorComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AddMemberSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
