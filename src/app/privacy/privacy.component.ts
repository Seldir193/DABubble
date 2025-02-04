import { Component, OnInit } from '@angular/core';
import { FooterComponent } from '../footer/footer.component';
import { HeaderComponent } from '../header/header.component';
import { Location } from '@angular/common';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [FooterComponent,HeaderComponent],
  templateUrl: './privacy.component.html',
  styleUrl: './privacy.component.scss'
})
export class PrivacyComponent implements OnInit  {

  constructor(private location: Location){}
  
  ngOnInit(): void {
  }

  goBack(): void {
    this.location.back();
  }
}
