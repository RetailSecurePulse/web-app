import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { createMockAuthService } from '../mock/auth.service.mock';
import { of, throwError } from 'rxjs';
import { AuthFacade } from '../services/auth.facade';

import { UserManagementComponent } from './user-management.component';
import { UserService } from '../services/user.service';
import { User } from '../models/user.model';

describe('UserManagementComponent', () => {
  let component: UserManagementComponent;
  let fixture: ComponentFixture<UserManagementComponent>;
  let userServiceSpy: jasmine.SpyObj<UserService>;
  let confirmSpy: jasmine.SpyObj<ConfirmationService>;

  const mockAuth = createMockAuthService();
  const mockUsers: User[] = [
    { id: 1, username: 'user1', password: '', email: 'user1@email.com', name: 'User One', roles: ['ADMIN'], isEnabled: true, temporaryPassword: true },
    { id: 2, username: 'user2', password: '', email: 'user2@email.com', name: 'User Two', roles: ['CASHIER'], isEnabled: false, temporaryPassword: false }
  ];

  beforeEach(async () => {
    userServiceSpy = jasmine.createSpyObj('UserService', [
      'getUsers', 'getUserById', 'createUser', 'editUser', 'deleteUser', 'resendPasswordEmail'
    ]);
    confirmSpy = jasmine.createSpyObj('ConfirmationService', ['confirm']);
    (confirmSpy as any).onClose = of({});
    (confirmSpy as any).onAccept = of({});
    (confirmSpy as any).onReject = of({});

    await TestBed.configureTestingModule({
      imports: [
        UserManagementComponent,
        NoopAnimationsModule,
        ConfirmDialogModule,
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: UserService, useValue: userServiceSpy },
        { provide: ConfirmationService, useValue: confirmSpy },
        { provide: AuthFacade, useValue: mockAuth }
      ]
    }).compileComponents();

    userServiceSpy.getUsers.and.returnValue(of(mockUsers));
    userServiceSpy.getUserById.and.callFake((userId: number) => {
      const foundUser = mockUsers.find(user => user.id === userId);
      return foundUser ? of(foundUser) : throwError(() => 'notFound');
    });
    fixture = TestBed.createComponent(UserManagementComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('loads users on success', () => {
      expect(component.users()).toEqual(mockUsers);
      expect(component.filteredUsers()).toEqual(mockUsers);
      expect(component.isLoading()).toBeFalse();
    });

    it('handles error on load', fakeAsync(() => {
      userServiceSpy.getUsers.and.returnValue(throwError(() => new Error('fail')));
      const localFixture = TestBed.createComponent(UserManagementComponent);
      const localComp = localFixture.componentInstance;
      tick();
      expect(localComp.isLoading()).toBeFalse();
      expect(localComp.error_msg()).toContain('Failed to load users');
    }));
  });

  describe('Filtering', () => {
    it('filters by name', () => {
      const event = { target: { value: 'one' } } as any;
      component.filterUsers(event);
      expect(component.filteredUsers().length).toBe(1);
      expect(component.filteredUsers()[0].name).toBe('User One');
    });

    it('resets filter with empty term', () => {
      const event = { target: { value: '' } } as any;
      component.filterUsers(event);
      expect(component.filteredUsers()).toEqual(mockUsers);
    });

    it('handles missing event target gracefully', () => {
      expect(() => component.filterUsers({} as any)).not.toThrow();
    });
  });

  describe('Form Validation', () => {
    it('new form invalid when empty', () => {
      component.newUserForm.setValue({ ctlUsername: '', ctlName: '', ctlEmail: '', ctlRole: '' });
      component.newUserForm.markAllAsTouched();
      expect(component.newUserForm.invalid).toBeTrue();
      expect(component.isFieldInvalid(component.newUserForm, 'ctlUsername')).toBeTrue();
    });

    it('new form valid when filled', () => {
      component.newUserForm.setValue({ ctlUsername: 'a', ctlName: 'b', ctlEmail: 'a@b.com', ctlRole: 'ADMIN' });
      expect(component.newUserForm.valid).toBeTrue();
    });

    it('edit form invalid when empty', () => {
      component.editUserForm.setValue({ ctlUsername: '', ctlName: '', ctlEmail: '', ctlRole: '', ctlStatus: '' });
      component.editUserForm.markAllAsTouched();
      expect(component.editUserForm.invalid).toBeTrue();
      expect(component.isFieldInvalid(component.editUserForm, 'ctlUsername')).toBeTrue();
    });

    it('edit form valid when filled', () => {
      component.editUserForm.setValue({ ctlUsername: 'a', ctlName: 'b', ctlEmail: 'a@b.com', ctlRole: 'ADMIN', ctlStatus: 'true' });
      expect(component.editUserForm.valid).toBeTrue();
    });

    it('isFieldInvalid returns false for undefined control', () => {
      expect(component.isFieldInvalid(component.newUserForm, 'notAField')).toBeFalse();
    });
  });

  describe('Dialogs and CRUD', () => {
    it('opens new dialog', () => {
      component.showNewUserDialog();
      expect(component.newDialog_visible()).toBeTrue();
      expect(component.newUserForm.pristine).toBeTrue();
    });

    it('creates user on confirm', fakeAsync(() => {
      const newUser: User = { id: 3, username: 'new', password: '', email: 'n@e.com', name: 'New', roles: ['ADMIN'], isEnabled: true };
      userServiceSpy.createUser.and.returnValue(of(newUser));
      component.newUserForm.setValue({ ctlUsername: 'new', ctlName: 'New', ctlEmail: 'n@e.com', ctlRole: 'ADMIN' });
      (confirmSpy.confirm as jasmine.Spy).and.callFake(opts => opts.accept());
      component.confirmRegisterUser();
      tick();
      expect(userServiceSpy.createUser).toHaveBeenCalledWith(jasmine.objectContaining({ username: 'new' }));
      expect(component.users().length).toBe(3);
      expect(component.success_msg()).toContain('registered');
    }));

    it('handles create error', fakeAsync(() => {
      userServiceSpy.createUser.and.returnValue(throwError(() => 'err'));
      component.newUserForm.setValue({ ctlUsername: 'new', ctlName: 'New', ctlEmail: 'n@e.com', ctlRole: 'ADMIN' });
      (confirmSpy.confirm as jasmine.Spy).and.callFake(opts => opts.accept());
      component.confirmRegisterUser();
      tick();
      expect(component.newDialog_error_msg()).toBe('err');
    }));

    it('does not create user if form invalid', () => {
      component.newUserForm.setValue({ ctlUsername: '', ctlName: '', ctlEmail: '', ctlRole: '' });
      (confirmSpy.confirm as jasmine.Spy).and.callFake(opts => opts.accept());
      component.confirmRegisterUser();
      expect(component.newDialog_error_msg()).toContain('required fields');
      expect(userServiceSpy.createUser).not.toHaveBeenCalled();
    });

    it('sets error_msg if register user is rejected', () => {
      (confirmSpy.confirm as jasmine.Spy).and.callFake(opts => opts.reject());
      component.confirmRegisterUser();
      expect(component.error_msg()).toContain('Registration canceled');
    });

    it('shows edit dialog and populates form', () => {
      component.showEditUserForm(mockUsers[0]);
      expect(userServiceSpy.getUserById).toHaveBeenCalledWith(1);
      expect(component.selectedUser()).toEqual(mockUsers[0]);
      expect(component.editDialog_visible()).toBeTrue();
      expect(component.editUserForm.value.ctlUsername).toBe('user1');
    });

    it('refreshes user before opening edit dialog', () => {
      const staleUser = { ...mockUsers[0], temporaryPassword: true };
      const freshUser = { ...mockUsers[0], temporaryPassword: false };
      userServiceSpy.getUserById.and.returnValue(of(freshUser));

      component.showEditUserForm(staleUser);

      expect(component.selectedUser()).toEqual(freshUser);
      expect(component.canResendPasswordEmail()).toBeFalse();
      expect(component.users()[0].temporaryPassword).toBeFalse();
    });

    it('does not open edit dialog if refresh fails', () => {
      userServiceSpy.getUserById.and.returnValue(throwError(() => 'loadErr'));

      component.showEditUserForm(mockUsers[0]);

      expect(component.editDialog_visible()).toBeFalse();
      expect(component.error_msg()).toBe('loadErr');
    });

    it('edits user on confirm', fakeAsync(() => {
      const updated = { ...mockUsers[0], name: 'Updated' };
      userServiceSpy.editUser.and.returnValue(of(updated));
      component.showEditUserForm(mockUsers[0]);
      component.editUserForm.patchValue({ ctlName: 'Updated' });
      (confirmSpy.confirm as jasmine.Spy).and.callFake(opts => opts.accept());
      component.confirmEditUser();
      tick();
      expect(userServiceSpy.editUser).toHaveBeenCalledWith(jasmine.objectContaining({ name: 'Updated' }));
      expect(component.users()[0].name).toBe('Updated');
      expect(component.success_msg()).toContain('edited');
    }));

    it('handles edit error', fakeAsync(() => {
      userServiceSpy.editUser.and.returnValue(throwError(() => 'editErr'));
      component.showEditUserForm(mockUsers[0]);
      component.editUserForm.patchValue({ ctlName: 'Updated' });
      (confirmSpy.confirm as jasmine.Spy).and.callFake(opts => opts.accept());
      component.confirmEditUser();
      tick();
      expect(component.editDialog_error_msg()).toBe('editErr');
    }));

    it('sets error_msg if edit user is rejected', () => {
      component.showEditUserForm(mockUsers[0]);
      (confirmSpy.confirm as jasmine.Spy).and.callFake(opts => opts.reject());
      component.confirmEditUser();
      expect(component.error_msg()).toContain('Edit canceled');
    });

    it('resends password email on confirm', fakeAsync(() => {
      userServiceSpy.resendPasswordEmail.and.returnValue(of(undefined));
      component.showEditUserForm(mockUsers[0]);
      (confirmSpy.confirm as jasmine.Spy).and.callFake(opts => opts.accept());
      component.confirmResendPasswordEmail();
      tick();
      expect(userServiceSpy.resendPasswordEmail).toHaveBeenCalledWith(1);
      expect(component.editDialog_visible()).toBeFalse();
      expect(component.success_msg()).toContain('new password');
    }));

    it('does not resend password email when password has already changed', () => {
      component.showEditUserForm(mockUsers[1]);
      component.confirmResendPasswordEmail();
      expect(userServiceSpy.resendPasswordEmail).not.toHaveBeenCalled();
      expect(confirmSpy.confirm).not.toHaveBeenCalled();
      expect(component.editDialog_error_msg()).toContain('already been changed');
    });

    it('handles resend password email error', fakeAsync(() => {
      userServiceSpy.resendPasswordEmail.and.returnValue(throwError(() => 'mailErr'));
      component.showEditUserForm(mockUsers[0]);
      (confirmSpy.confirm as jasmine.Spy).and.callFake(opts => opts.accept());
      component.confirmResendPasswordEmail();
      tick();
      expect(component.editDialog_error_msg()).toBe('mailErr');
    }));

    it('sets error_msg if resend password email is rejected', () => {
      component.showEditUserForm(mockUsers[0]);
      (confirmSpy.confirm as jasmine.Spy).and.callFake(opts => opts.reject());
      component.confirmResendPasswordEmail();
      expect(component.error_msg()).toContain('Password email canceled');
    });

    it('deletes user on confirm', fakeAsync(() => {
      userServiceSpy.deleteUser.and.returnValue(of(undefined));
      (confirmSpy.confirm as jasmine.Spy).and.callFake(opts => opts.accept());
      component.confirmDeleteUser(mockUsers[0]);
      tick();
      expect(userServiceSpy.deleteUser).toHaveBeenCalledWith(1);
      expect(component.users().length).toBe(1);
      expect(component.success_msg()).toContain('deleted');
    }));

    it('handles delete error', fakeAsync(() => {
      userServiceSpy.deleteUser.and.returnValue(throwError(() => 'delErr'));
      (confirmSpy.confirm as jasmine.Spy).and.callFake(opts => opts.accept());
      component.confirmDeleteUser(mockUsers[0]);
      tick();
      expect(component.newDialog_error_msg()).toBe('delErr');
    }));

    it('sets error_msg if delete user is rejected', () => {
      (confirmSpy.confirm as jasmine.Spy).and.callFake(opts => opts.reject());
      component.confirmDeleteUser(mockUsers[0]);
      expect(component.error_msg()).toContain('Deletion canceled');
    });
  });

  describe('Edge and Utility Cases', () => {
    it('resetMessages clears all messages', () => {
      component.error_msg.set('err');
      component.success_msg.set('ok');
      component.newDialog_error_msg.set('err2');
      component.editDialog_error_msg.set('err3');
      component.resetMessages();
      expect(component.error_msg()).toBeNull();
      expect(component.success_msg()).toBeNull();
      expect(component.newDialog_error_msg()).toBeNull();
      expect(component.editDialog_error_msg()).toBeNull();
    });

    it('isFieldInvalid returns false for valid control', () => {
      const form = component.newUserForm;
      const control = form.get('ctlUsername');
      control?.setValue('Valid');
      control?.markAsTouched();
      expect(component.isFieldInvalid(form, 'ctlUsername')).toBeFalse();
    });

    it('isFieldInvalid returns true for invalid and touched', () => {
      const form = component.newUserForm;
      const control = form.get('ctlUsername');
      control?.setValue('');
      control?.markAsTouched();
      expect(component.isFieldInvalid(form, 'ctlUsername')).toBeTrue();
    });

    it('should not throw if showEditUserForm is called with null', () => {
      expect(() => component.showEditUserForm(null as any)).not.toThrow();
    });

    it('should not throw if deleteUser is called with null', () => {
      expect(() => component.deleteUser(null as any)).not.toThrow();
    });

    it('should not throw if editUser is called with no selected user', () => {
      component.selectedUser.set(null);
      expect(() => component.editUser()).not.toThrow();
    });
  });
});
