class User {
  constructor({ id, email, password, role }) {
    this.id = id;
    this.email = email;
    this.password = password;
    this.role = role;
  }

  isAdmin() {
    return this.role === 'ADMIN';
  }
}

export default User;