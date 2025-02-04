import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MemberSectionDialogComponent } from './member-section-dialog.component';

describe('MemberSectionDialogComponent', () => {
  let component: MemberSectionDialogComponent;
  let fixture: ComponentFixture<MemberSectionDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MemberSectionDialogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MemberSectionDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
