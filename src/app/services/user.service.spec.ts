import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { UserService } from './user.service';
import { User, CreateUserDTO, UpdateUserDTO, ChangePasswordDTO } from '../models/user.model';
import { apiConfig, environment } from '../../environments/environment';

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;
  const apiUrl = apiConfig.user_api_url + 'api/users';

  const mockUser: User = {
    id: 1,
    username: 'testuser',
    password: 'pass',
    email: 'test@email.com',
    name: 'Test User',
    roles: ['ADMIN'],
    isEnabled: true
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        UserService
      ]
    });
    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getUsers', () => {
    it('should GET users', () => {
      service.getUsers().subscribe(users => {
        expect(users).toEqual([mockUser]);
      });
      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('GET');
      req.flush([mockUser]);
    });

    it('should handle error', () => {
      service.getUsers().subscribe({
        next: () => fail('should error'),
        error: (err) => {
          expect(err.message).toBe('fail');
        }
      });
      const req = httpMock.expectOne(apiUrl);
      req.flush({ message: 'fail' }, { status: 500, statusText: 'Server Error' });
    });
  });

  describe('getUserByUsername', () => {
    it('should GET user by username', () => {
      service.getUserByUsername('testuser').subscribe(user => {
        expect(user).toEqual(mockUser);
      });
      const req = httpMock.expectOne(`${apiUrl}/username/testuser`);
      expect(req.request.method).toBe('GET');
      req.flush(mockUser);
    });

    it('should handle error', () => {
      service.getUserByUsername('testuser').subscribe({
        next: () => fail('should error'),
        error: (err) => {
          expect(err.message).toBe('notfound');
        }
      });
      const req = httpMock.expectOne(`${apiUrl}/username/testuser`);
      req.flush({ message: 'notfound' }, { status: 404, statusText: 'Not Found' });
    });
  });

  describe('createUser', () => {
    it('should POST new user', () => {
      const dto: CreateUserDTO = {
        username: mockUser.username,
        password: environment.defaultPassword,
        email: mockUser.email,
        name: mockUser.name,
        roles: mockUser.roles
      };
      service.createUser(mockUser).subscribe(user => {
        expect(user).toEqual(mockUser);
      });
      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush(mockUser);
    });

    it('should handle error', () => {
      service.createUser(mockUser).subscribe({
        next: () => fail('should error'),
        error: (err) => {
          expect(err.message).toBe('exists');
        }
      });
      const req = httpMock.expectOne(apiUrl);
      req.flush({ message: 'exists' }, { status: 409, statusText: 'Conflict' });
    });
  });

  describe('editUser', () => {
    it('should PUT updated user', () => {
      const updateDto: UpdateUserDTO = {
        email: mockUser.email,
        name: mockUser.name,
        roles: mockUser.roles,
        isEnabled: mockUser.isEnabled
      };
      service.editUser(mockUser).subscribe(user => {
        expect(user).toEqual(mockUser);
      });
      const req = httpMock.expectOne(`${apiUrl}/${mockUser.id}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updateDto);
      req.flush(mockUser);
    });

    it('should handle error', () => {
      service.editUser(mockUser).subscribe({
        next: () => fail('should error'),
        error: (err) => {
          expect(err.message).toBe('editfail');
        }
      });
      const req = httpMock.expectOne(`${apiUrl}/${mockUser.id}`);
      req.flush({ message: 'editfail' }, { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('deleteUser', () => {
    it('should DELETE user', () => {
      service.deleteUser(mockUser.id).subscribe(res => {
        expect(res).toBeUndefined();
      });
      const req = httpMock.expectOne(`${apiUrl}/${mockUser.id}`);
      expect(req.request.method).toBe('DELETE');
    });

    it('should handle error', () => {
      service.deleteUser(mockUser.id).subscribe({
        next: () => fail('should error'),
        error: (err) => {
          expect(err.message).toBe('deletefail');
        }
      });
      const req = httpMock.expectOne(`${apiUrl}/${mockUser.id}`);
      req.flush({ message: 'deletefail' }, { status: 500, statusText: 'Server Error' });
    });
  });

  describe('changePassword', () => {
    it('should PATCH change password', () => {
      const dto: ChangePasswordDTO = {
        oldPassword: 'old',
        newPassword: 'new'
      };
      service.changePassword(mockUser.id, 'old', 'new').subscribe(res => {
        expect(res).toBeUndefined();
      });
      const req = httpMock.expectOne(`${apiUrl}/${mockUser.id}/change-password`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(dto);
    });

    it('should handle error', () => {
      service.changePassword(mockUser.id, 'old', 'new').subscribe({
        next: () => fail('should error'),
        error: (err) => {
          expect(err.message).toBe('');
        }
      });
      const req = httpMock.expectOne(`${apiUrl}/${mockUser.id}/change-password`);
      req.flush({ message: '' }, { status: 400, statusText: 'Bad Request' });
    });
  });

  // Edge case: createUser with missing fields
  it('should handle createUser with missing fields', () => {
    const incompleteUser = { ...mockUser, username: '' };
    service.createUser(incompleteUser).subscribe({
      next: () => fail('should error'),
      error: (err) => {
        expect(err.message).toBe('missing');
      }
    });
    const req = httpMock.expectOne(apiUrl);
    req.flush({ message: 'missing' }, { status: 400, statusText: 'Bad Request' });
  });

  // Edge case: editUser with invalid id
  it('should handle editUser with invalid id', () => {
    const invalidUser = { ...mockUser, id: 0 };
    service.editUser(invalidUser).subscribe({
      next: () => fail('should error'),
      error: (err) => {
        expect(err.message).toBe('invalid');
      }
    });
    const req = httpMock.expectOne(`${apiUrl}/0`);
    req.flush({ message: 'invalid' }, { status: 404, statusText: 'Not Found' });
  });
});