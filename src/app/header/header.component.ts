import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit {
  showRegister = true;

  @Input() hideContentContainer = false;

  constructor(private router: Router) {}
  ngOnInit(): void {
    this.showRegister =
      this.router.url !== '/signup' && this.router.url !== '/avatar';
  }

  navigateToSignup() {
    this.router.navigate(['/signup']);
  }
}
