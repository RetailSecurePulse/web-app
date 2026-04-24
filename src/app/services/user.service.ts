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
        throw new Error(this.extractErrorMessage(err));
      })
    );
  }

  getUserByUsername(username: string): Observable<User> {
    const urlGetUser = `${this.apiUrl}/username/${username}`;

    return this.http.get<User>(urlGetUser).pipe(
      catchError((err) => {
        throw new Error(this.extractErrorMessage(err));
      })
    );
  }

  getUserById(userId: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/id/${userId}`).pipe(
      catchError((err) => {
        throw new Error(this.extractErrorMessage(err));
      })
    );
  }

  createUser(newUser: User): Observable<User> {
    const create_user_dto: CreateUserDTO = {
      username: newUser.username,
      email: newUser.email,
      name: newUser.name,
      roles: newUser.roles
    };

    return this.http.post<User>(this.apiUrl, create_user_dto).pipe(
      catchError((err) => {
        throw new Error(this.extractErrorMessage(err));
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
        throw new Error(this.extractErrorMessage(err));
      })
    );
  }

  deleteUser(userId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${userId}`).pipe(
      catchError((err) => {
        throw new Error(this.extractErrorMessage(err));
      })
    );
  }

  resendPasswordEmail(userId: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${userId}/resend-password`, null, {
      responseType: 'text' as 'json'
    }).pipe(
      catchError((err) => {
        throw new Error(this.extractErrorMessage(err));
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
        throw new Error(this.extractErrorMessage(err));
      })
    );
  }

  private extractErrorMessage(err: any): string {
    const errorBody = err?.error;

    if (errorBody?.message) {
      return errorBody.message;
    }

    if (typeof errorBody === 'string') {
      try {
        const parsedBody = JSON.parse(errorBody);
        return parsedBody?.message ?? errorBody;
      } catch {
        return errorBody;
      }
    }

    return err?.message ?? '';
  }
}
