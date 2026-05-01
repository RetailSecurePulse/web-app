export interface User {
  id: number;            // Unique identifier for the user
  username: string;      // Username of the user
  password: string;      // Password of the user
  email: string;         // Email of the user
  name: string;          // Full name of the user
  roles: string[];          // Role of the user (e.g., ADMIN, CASHER, OPERATOR etc.)
  isEnabled: boolean;      // Status of the user. User may be disabled by the admin or too many entry of wrong password
  temporaryPassword?: boolean; // True until the user changes the generated password
}

export interface CreateUserDTO {
  username: string;
  email: string;
  name: string;
  roles: string[];
}

export interface UpdateUserDTO {
  name: string;
  email: string;
  roles: string[];
  isEnabled: boolean;
}

export interface ChangePasswordDTO {
  oldPassword: string;
  newPassword: string;
}


export const UserRoles = [
  { label: 'Admin', value: 'ADMIN' },
  { label: 'Manager', value: 'MANAGER' },
  { label: 'Inventory Manager', value: 'INVENTORY_MANAGER' },
  { label: 'Cashier', value: 'CASHIER' },
];
