class Categoria {
  constructor(nombre, descripcion = '', imagen = '') {
    this.nombre = nombre;
    this.descripcion = descripcion;
    this.imagen = imagen;
    this.activa = true;
  }
}

module.exports = Categoria;
