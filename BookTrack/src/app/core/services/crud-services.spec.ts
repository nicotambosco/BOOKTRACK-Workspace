import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { BookService } from './book.service';
import { UserService } from './user.service';
import { CategoryService } from './category.service';
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
      const book = { titulo: 'T', autor: 'A', editorial: 'E', fechaPublicacion: '2020', descripcion: '', categoria: 'Basicas' };
      s.create(book).subscribe(); s.update(4, book).subscribe(); s.delete(4).subscribe(); s.getById(4).subscribe();
      const reqs = ctrl.match(() => true);
      expect(reqs.map(line)).toEqual([
        `POST ${API}/books/`, `PUT ${API}/books/4/`, `DELETE ${API}/books/4/`, `GET ${API}/books/4/`]);
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
      s.getAll().subscribe(); s.getProfile().subscribe(); s.getById(3).subscribe();
      s.update(3, { nombreApellido: 'Z' }).subscribe(); s.delete(3).subscribe();
      const reqs = ctrl.match(() => true);
      expect(reqs.map(line)).toEqual([
        `GET ${API}/users/`, `GET ${API}/users/me/`, `GET ${API}/users/3/`, `PATCH ${API}/users/3/`, `DELETE ${API}/users/3/`]);
      reqs.forEach(r => r.flush({}));
    });
  });

  describe('CategoryService', () => {
    it('lists, creates and renames categories', () => {
      const s = TestBed.inject(CategoryService);
      s.getAll().subscribe(); s.add('Nueva').subscribe(); s.edit(2, 'Otra').subscribe();
      const reqs = ctrl.match(() => true);
      expect(reqs.map(line)).toEqual([
        `GET ${API}/categories/`, `POST ${API}/categories/`, `PATCH ${API}/categories/2/`]);
      expect(reqs[1].request.body).toEqual({ nombre: 'Nueva' });
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
