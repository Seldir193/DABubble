import { ComponentFixture, TestBed } from '@angular/core/testing';

//import { SearchResultDialogComponent } from './search-result-dialog.component';

import { SelectResultDialogComponent } from './search-result-dialog.component';
import { appConfig } from '../app.config';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';


describe('SearchResultDialogComponent', () => {
  let component: SelectResultDialogComponent;
  let fixture: ComponentFixture<SelectResultDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectResultDialogComponent],
      providers: [
                         // Minimaler Mock-DialogRef
                         { provide: MatDialogRef, useValue: {} },
                         { provide: MAT_DIALOG_DATA, useValue: { /* beliebige Mock-Daten */ } },
                         ...appConfig.providers
                       ],
                       
          

    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SelectResultDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

 
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  
});
