import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent implements OnInit {
  showRegister = true;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.showRegister = this.router.url !== '/signup';
    this.showRegister = this.router.url !== '/avatar';
  }

  navigateToSignup() {
    this.router.navigate(['/signup']);
  }
}
