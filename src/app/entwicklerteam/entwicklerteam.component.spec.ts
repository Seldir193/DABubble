import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EntwicklerteamComponent } from './entwicklerteam.component';

describe('EntwicklerteamComponent', () => {
  let component: EntwicklerteamComponent;
  let fixture: ComponentFixture<EntwicklerteamComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EntwicklerteamComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EntwicklerteamComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
