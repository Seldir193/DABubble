import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PrivateMessagesComponent } from './private-messages.component';
import { appConfig } from '../app.config';

describe('PrivateMessagesComponent', () => {
  let component: PrivateMessagesComponent;
  let fixture: ComponentFixture<PrivateMessagesComponent>;

  beforeEach(async () => {
    

    await TestBed.configureTestingModule({
      imports: [PrivateMessagesComponent ],
      providers: [
        ...appConfig.providers,
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PrivateMessagesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
