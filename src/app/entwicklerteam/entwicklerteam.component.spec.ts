import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EntwicklerteamComponent } from './entwicklerteam.component';
import { appConfig } from '../app.config';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

describe('EntwicklerteamComponent', () => {
  let component: EntwicklerteamComponent;
  let fixture: ComponentFixture<EntwicklerteamComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EntwicklerteamComponent],
       providers: [
                              
                    { provide: MatDialogRef, useValue: {} },
                    { provide: MAT_DIALOG_DATA, useValue: { } },
                      ...appConfig.providers
                    ],
        
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
