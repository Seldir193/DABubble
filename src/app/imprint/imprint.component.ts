import { Component, OnInit } from '@angular/core';
import { FooterComponent } from '../footer/footer.component';
import { HeaderComponent } from '../header/header.component';
import { Location } from '@angular/common';

@Component({
  selector: 'app-imprint',
  standalone: true,
  imports: [FooterComponent,HeaderComponent],
  templateUrl: './imprint.component.html',
  styleUrl: './imprint.component.scss'
})
export class ImprintComponent implements OnInit {

  constructor(private location: Location){}

  ngOnInit(): void {
  }

  goBack(){
    this.location.back();
  }
}
