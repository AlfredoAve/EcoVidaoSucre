class Producto {
  constructor(nombre, descripcion, precio, stock, categoriaId, imagen = '') {
    this.nombre = nombre;
    this.descripcion = descripcion;
    this.precio = precio;
    this.stock = stock;
    this.categoriaId = categoriaId;
    this.imagen = imagen;
    this.activo = true;
    this.fechaCreacion = new Date();
  }
}

module.exports = Producto;
