import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PasswortResetComponent } from './passwort-reset.component';

describe('PasswortResetComponent', () => {
  let component: PasswortResetComponent;
  let fixture: ComponentFixture<PasswortResetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PasswortResetComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PasswortResetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
