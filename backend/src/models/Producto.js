class Producto {
  constructor(nombre, descripcion, precio, stock, categoriaId, imagen = '', destacado = false, beneficios = []) {
    this.nombre = nombre;
    this.descripcion = descripcion;
    this.precio = precio;
    this.stock = stock;
    this.categoriaId = categoriaId;
    this.imagen = imagen;
    this.destacado = destacado;
    this.beneficios = beneficios;
    this.activo = true;
    this.fechaCreacion = new Date();
  }
}

module.exports = Producto;
