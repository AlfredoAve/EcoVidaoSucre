class Carrito {
  constructor(usuarioId, productoId, cantidad, precioUnitario) {
    this.usuarioId = usuarioId;
    this.productoId = productoId;
    this.cantidad = cantidad;
    this.precioUnitario = precioUnitario;
    this.fechaAgregado = new Date();
  }

  getSubtotal() {
    return this.cantidad * this.precioUnitario;
  }
}

module.exports = Carrito;
