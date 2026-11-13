import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Header } from '../../../shared/components/header/header';
import { LoanManagement } from '../../loans/loan-management/loan-management';

@Component({
  selector: 'app-home-admin',
  standalone: true,
  imports: [Header, RouterLink, LoanManagement],
  templateUrl: './home-admin.html',
  styleUrl: './home-admin.scss',
})
export class HomeAdmin {}
