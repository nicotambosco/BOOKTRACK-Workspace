import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { BookService } from './book.service';
import { UserService } from './user.service';
import { CommentService } from './comment.service';
import { environment } from '../../../environments/environment';
import { testProviders } from '../../testing/test-providers';

const API = environment.apiUrl;
const line = (r: { request: { method: string; url: string } }) => `${r.request.method} ${r.request.url}`;

describe('HTTP services (contract with the API)', () => {
  let ctrl: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: testProviders });
    ctrl = TestBed.inject(HttpTestingController);
  });
  afterEach(() => ctrl.verify());

  describe('BookService', () => {
    it('lists, filters by category and searches by title', () => {
      const s = TestBed.inject(BookService);
      s.getAll().subscribe(); s.getByCategory('Sistemas').subscribe(); s.search('algo').subscribe();
      const reqs = ctrl.match(() => true);
      expect(reqs.map(r => r.request.urlWithParams)).toEqual([
        `${API}/books/`, `${API}/books/?categoria=Sistemas`, `${API}/books/?q=algo`]);
      reqs.forEach(r => r.flush([]));
    });

    it('creates, updates (PUT), deletes and fetches by id', () => {
      const s = TestBed.inject(BookService);
      const isbn = '9780000000004';
      const book = { isbn, titulo: 'T', autor: 'A', resumen: '', categoria: 'Basicas' };
      s.create(book).subscribe(); s.update(isbn, book).subscribe(); s.delete(isbn).subscribe(); s.getById(isbn).subscribe();
      const reqs = ctrl.match(() => true);
      expect(reqs.map(line)).toEqual([
        `POST ${API}/books/`, `PUT ${API}/books/9780000000004/`, `DELETE ${API}/books/9780000000004/`, `GET ${API}/books/9780000000004/`]);
      reqs.forEach(r => r.flush({}));
    });

    it('uploads the cover as multipart form data', () => {
      TestBed.inject(BookService).uploadImage(new File(['x'], 'c.png', { type: 'image/png' })).subscribe();
      const req = ctrl.expectOne(`${API}/books/upload-image/`);
      expect(req.request.body instanceof FormData).toBe(true);
      expect((req.request.body as FormData).get('file')).toBeTruthy();
      req.flush({ url: 'data:image/png;base64,eA==' });
    });
  });

  describe('UserService', () => {
    it('uses the expected routes and verbs', () => {
      const s = TestBed.inject(UserService);
      s.getAll().subscribe(); s.getProfile().subscribe(); s.getById('13885').subscribe();
      s.update('13885', { nombreApellido: 'Z' }).subscribe(); s.delete('13885').subscribe();
      const reqs = ctrl.match(() => true);
      expect(reqs.map(line)).toEqual([
        `GET ${API}/users/`, `GET ${API}/users/me/`, `GET ${API}/users/13885/`, `PATCH ${API}/users/13885/`, `DELETE ${API}/users/13885/`]);
      reqs.forEach(r => r.flush({}));
    });
  });

  describe('CommentService', () => {
    it('posts section and comment', () => {
      TestBed.inject(CommentService).send('Catálogo', 'Muy bueno').subscribe();
      const req = ctrl.expectOne(`${API}/comments/`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ seccion: 'Catálogo', comentario: 'Muy bueno' });
      req.flush(null);
    });
  });
});
