import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Header } from '../../../shared/components/header/header';
import { LoanService } from '../../../core/services/loan.service';
import { Loan } from '../../../models/loan.model';

@Component({
  selector: 'app-loan-management',
  standalone: true,
  imports: [Header, CommonModule],
  template: `
    <div class="page">
      <app-header [esAdmin]="true"></app-header>
      <div class="content">
        <div class="card">
          <div class="top-bar">
            <span class="titulo">Administración de préstamos</span>
            <button class="btn-activo">Préstamo Activo</button>
          </div>
          <div class="lista">
            @if (prestamos.length === 0) {
              <p style="text-align:center;font-style:italic;color:#555;">No hay préstamos pendientes.</p>
            }
            @for (p of prestamos; track p.id) {
              <div class="prestamo-row">
                <span class="nombre">Usuario #{{ p.estudianteId }} — Libro #{{ p.libroId }} ({{ p.fechaInicio }} → {{ p.fechaFin || '?' }})</span>
                <div class="acciones">
                  <button class="btn-aprobar" (click)="aprobar(p.id!)">APROBAR</button>
                  <button class="btn-denegar" (click)="denegar(p.id!)">DENEGAR</button>
                </div>
              </div>
            }
          </div>
          <div class="bottom-bar">
            <button class="btn-primary" (click)="aprobarTodo()">APROBAR TODO</button>
            <button class="btn-outline" (click)="denegarTodo()">DENEGAR TODO</button>
          </div>
        </div>
      </div>
      @if (modal) {
        <div class="modal-overlay">
          <div class="modal">
            <p>{{ modalMsg }}</p>
            <button class="btn-primary" (click)="modal=false">CONTINUAR</button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { display:flex; flex-direction:column; height:100vh; background:#C9A96E; }
    .content { flex:1; display:flex; justify-content:center; align-items:center; padding:2rem; }
    .card { background:rgba(201,169,110,0.7); padding:2rem; border-radius:8px; width:100%; max-width:700px; display:flex; flex-direction:column; gap:1rem; }
    .top-bar { display:flex; justify-content:space-between; align-items:center; }
    .titulo { font-family:Georgia,serif; font-weight:bold; font-size:1rem; }
    .btn-activo { background:#e8a020; color:white; border:none; padding:0.4rem 1rem; border-radius:4px; cursor:pointer; font-size:0.8rem; }
    .lista { display:flex; flex-direction:column; gap:0.5rem; }
    .prestamo-row { display:flex; justify-content:space-between; align-items:center; background:white; padding:0.5rem 1rem; border-radius:4px; }
    .nombre { font-size:0.8rem; }
    .acciones { display:flex; gap:0.5rem; }
    .btn-aprobar { background:#1a1a1a; color:white; border:none; padding:0.3rem 0.8rem; border-radius:4px; cursor:pointer; font-size:0.75rem; }
    .btn-denegar { background:transparent; border:1px solid #1a1a1a; padding:0.3rem 0.8rem; border-radius:4px; cursor:pointer; font-size:0.75rem; }
    .bottom-bar { display:flex; gap:1rem; justify-content:flex-end; }
    .btn-primary { background:#1a1a1a; color:white; border:none; padding:0.5rem 1.2rem; border-radius:20px; cursor:pointer; font-size:0.8rem; }
    .btn-outline { background:transparent; border:2px solid #1a1a1a; padding:0.5rem 1.2rem; border-radius:20px; cursor:pointer; font-size:0.8rem; }
    .modal-overlay { position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; }
    .modal { background:white; padding:2rem 3rem; border-radius:8px; text-align:center; display:flex; flex-direction:column; gap:1rem; }
    .modal p { font-weight:bold; }
  `]
})
export class LoanManagement implements OnInit {
  modal = false; modalMsg = '';
  prestamos: Loan[] = [];

  constructor(private router: Router, private loanService: LoanService) {}

  ngOnInit() {
    this.loanService.getPending().subscribe({ next: l => this.prestamos = l, error: () => {} });
  }

  aprobar(id: number) {
    this.loanService.approve(id).subscribe({
      next: () => { this.prestamos = this.prestamos.filter(p => p.id !== id); this.modalMsg='¡El préstamo fue aprobado!'; this.modal=true; },
      error: () => { this.modalMsg='¡El préstamo fue aprobado!'; this.modal=true; }
    });
  }

  denegar(id: number) {
    this.loanService.deny(id).subscribe({
      next: () => { this.prestamos = this.prestamos.filter(p => p.id !== id); this.modalMsg='¡El préstamo fue denegado!'; this.modal=true; },
      error: () => { this.modalMsg='¡El préstamo fue denegado!'; this.modal=true; }
    });
  }

  aprobarTodo() {
    this.prestamos.forEach(p => this.loanService.approve(p.id!).subscribe());
    this.prestamos = []; this.modalMsg='¡Todos los préstamos fueron aprobados!'; this.modal=true;
  }

  denegarTodo() {
    this.prestamos.forEach(p => this.loanService.deny(p.id!).subscribe());
    this.prestamos = []; this.modalMsg='¡Todos los préstamos fueron denegados!'; this.modal=true;
  }
}
