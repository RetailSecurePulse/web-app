import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable } from 'rxjs';
import {
  User,
  CreateUserDTO,
  UpdateUserDTO,
  ChangePasswordDTO
} from '../models/user.model';
import { ConfigService } from '../services/config.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly http: HttpClient = inject(HttpClient);
  private readonly config: ConfigService = inject(ConfigService);
  private readonly apiUrl = this.config.apiConfig.user_api_url + 'api/users';

  constructor() {}

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl).pipe(
      catchError((err) => {
        throw new Error(err.error.message);
      })
    );
  }

  getUserByUsername(username: string): Observable<User> {
    const urlGetUser = `${this.apiUrl}/username/${username}`;

    return this.http.get<User>(urlGetUser).pipe(
      catchError((err) => {
        throw new Error(err.error.message);
      })
    );
  }

  createUser(newUser: User): Observable<User> {
    const create_user_dto: CreateUserDTO = {
      username: newUser.username,
      password: this.createTemporaryPassword(),
      email: newUser.email,
      name: newUser.name,
      roles: newUser.roles
    };

    return this.http.post<User>(this.apiUrl, create_user_dto).pipe(
      catchError((err) => {
        throw new Error(err.error.message);
      })
    );
  }

  editUser(currUser: User): Observable<User> {
    const update_user_dto: UpdateUserDTO = {
      email: currUser.email,
      name: currUser.name,
      roles: currUser.roles,
      isEnabled: currUser.isEnabled
    };

    return this.http.put<User>(`${this.apiUrl}/${currUser.id}`, update_user_dto).pipe(
      catchError((err) => {
        throw new Error(err.error.message);
      })
    );
  }

  deleteUser(userId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${userId}`).pipe(
      catchError((err) => {
        throw new Error(err.error.message);
      })
    );
  }

  changePassword(userId: number, oldPasswordIn: string, newPasswordIn: string): Observable<void> {
    const change_password_dto: ChangePasswordDTO = {
      oldPassword: oldPasswordIn,
      newPassword: newPasswordIn
    };

    const fullURL = `${this.apiUrl}/${userId}/change-password`;

    return this.http.patch<void>(fullURL, change_password_dto, {
      responseType: 'text' as 'json'
    }).pipe(
      catchError((err) => {
        throw new Error(err.error.message);
      })
    );
  }

  private createTemporaryPassword(length: number = 20): string {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnopqrstuvwxyz';
    const digits = '23456789';
    const all = upper + lower + digits;

    const passwordChars = [
      this.randomChar(upper),
      this.randomChar(lower),
      this.randomChar(digits)
    ];

    while (passwordChars.length < length) {
      passwordChars.push(this.randomChar(all));
    }

    for (let i = passwordChars.length - 1; i > 0; i--) {
      const j = this.randomInt(i + 1);
      [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
    }

    return passwordChars.join('');
  }

  private randomChar(charset: string): string {
    return charset[this.randomInt(charset.length)];
  }

  private randomInt(maxExclusive: number): number {
    const bytes = new Uint32Array(1);
    crypto.getRandomValues(bytes);
    return bytes[0] % maxExclusive;
  }
}
