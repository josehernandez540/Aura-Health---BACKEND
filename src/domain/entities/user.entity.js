export class User {
  constructor({ id, email, password, role, isActive, mustChangePassword }) {
    this.id = id;
    this.email = email;
    this.password = password;
    this.role = role;
    this.isActive = isActive ?? true;
    this.mustChangePassword = mustChangePassword ?? false;
  }

  canAuthenticate() {
    return this.isActive === true;
  }

  requiresPasswordChange() {
    return this.mustChangePassword === true;
  }

  isAdmin() {
    return this.role === 'ADMIN';
  }

  isDoctor() {
    return this.role === 'DOCTOR';
  }
}