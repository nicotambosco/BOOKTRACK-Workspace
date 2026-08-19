import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth/auth-guard';
import { Landing } from './features/auth/landing/landing';
import { Login } from './features/auth/login/login';
import { Register } from './features/auth/register/register';
import { ForgotPassword } from './features/auth/forgot-password/forgot-password';
import { ResetPasswordSent } from './features/auth/reset-password-sent/reset-password-sent';
import { HomeUser } from './features/home/home-user/home-user';
import { HomeAdmin } from './features/home/home-admin/home-admin';
import { BookDetail } from './features/books/book-detail/book-detail';
import { BookAdd } from './features/books/book-add/book-add';
import { BookEdit } from './features/books/book-edit/book-edit';
import { LoanRequest } from './features/loans/loan-request/loan-request';
import { LoanManagement } from './features/loans/loan-management/loan-management';
import { LoanHistory } from './features/loans/loan-history/loan-history';
import { ProfileUser } from './features/profile/profile-user/profile-user';
import { ProfileAdmin } from './features/profile/profile-admin/profile-admin';
import { UserManagement } from './features/admin/user-management/user-management';
import { Reports } from './features/admin/reports/reports';
import { CommentForm } from './features/comments/comment-form/comment-form';
import { ModalSuccess } from './shared/components/modal-success/modal-success';
import { ModalError } from './shared/components/modal-error/modal-error';
import { BookSearch } from './features/books/book-search/book-search';
import { LoanExtension } from './features/loans/loan-extension/loan-extension';
import { UserHistory } from './features/loans/user-history/user-history';
import { LoanArchive } from './features/loans/loan-archive/loan-archive';

export const routes: Routes = [
  { path: '', component: Landing },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'forgot-password', component: ForgotPassword },
  { path: 'reset-password-sent', component: ResetPasswordSent },
  
  {
    path: 'home',
    component: HomeUser,
    // canActivate: [authGuard],
    data: { roles: ['usuario', 'bibliotecario'] }
  },
  {
    path: 'home-admin', //falta
    component: HomeAdmin,
    // canActivate: [authGuard],
    data: { roles: ['bibliotecario'] }
  },
  {
    path: 'book/:id',
    component: BookDetail,
    canActivate: [authGuard]
  },
  {
    path: 'book-add',
    component: BookAdd,
    // canActivate: [authGuard],
    data: { roles: ['bibliotecario'] }
  },
  {
    path: 'book-edit/:id', //falta
    component: BookEdit,
    // canActivate: [authGuard],
    data: { roles: ['bibliotecario'] }
  },
  {
    path: 'loan-request/:bookId',
    component: LoanRequest,
    // canActivate: [authGuard]
  },
  {
    path: 'loan-management',
    component: LoanManagement,
    // canActivate: [authGuard],
    data: { roles: ['bibliotecario'] }
  },
  {
    path: 'loan-history',
    component: LoanHistory,
    // canActivate: [authGuard],
    data: { roles: ['bibliotecario'] }
  },
  {
    path: 'profile',
    component: ProfileUser,
    // canActivate: [authGuard]
  },
  {
    path: 'profile-admin',
    component: ProfileAdmin,
    // canActivate: [authGuard],
    data: { roles: ['bibliotecario'] }
  },
  {
    path: 'user-management',
    component: UserManagement,
    // canActivate: [authGuard],
    data: { roles: ['bibliotecario'] }
  },
  {
    path: 'reports', //falta
    component: Reports,
    // canActivate: [authGuard],
    data: { roles: ['bibliotecario'] }
  },
  { path: 'comment-form', component: CommentForm },
  { path: 'modal-success', component: ModalSuccess },
  { path: 'modal-error', component: ModalError },
  { path: 'book-search', component: BookSearch },
  { path: 'loan-extension', component: LoanExtension },
  { path: 'user-history', component: UserHistory },
  { path: 'loan-archive', component: LoanArchive },
  { path: '**', redirectTo: '' }
];