import { Component, OnInit} from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-intro',
  standalone: true,
  imports: [],
  templateUrl: './intro.component.html',
  styleUrl: './intro.component.scss'
})
export class IntroComponent implements OnInit   {

  constructor(private router: Router) { }

  ngOnInit(): void {
    // Verzögere die Navigation zur Login-Seite um 3 Sekunden
    setTimeout(() => {
      this.router.navigate(['/login']);
    }, 4000); // 3000 Millisekunden = 3 Sekunden
  }
 
 
}
