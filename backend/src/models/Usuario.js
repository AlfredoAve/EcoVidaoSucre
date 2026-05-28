class Usuario {
  constructor(nombre, email, contrasena, rol = 'cliente', telefono = '', direccion = '', ciudad = '') {
    this.nombre = nombre;
    this.email = email;
    this.contrasena = contrasena;
    this.rol = rol;
    this.telefono = telefono;
    this.direccion = direccion;
    this.ciudad = ciudad;
    this.activo = true;
    this.fechaRegistro = new Date();
  }
}

module.exports = Usuario;
