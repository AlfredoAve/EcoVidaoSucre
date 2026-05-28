class Orden {
  constructor(usuarioId, productos, total, direccionEnvio, metodoPago = 'mercadopago') {
    this.usuarioId = usuarioId;
    this.productos = productos; // Array de {productoId, nombre, cantidad, precio}
    this.total = total;
    this.direccionEnvio = direccionEnvio;
    this.metodoPago = metodoPago;
    this.estado = 'pendiente'; // pendiente, confirmada, completada, cancelada
    this.numeroSeguimiento = null;
    this.fechaCreacion = new Date();
    this.fechaCompletada = null;
  }

  actualizarEstado(nuevoEstado) {
    this.estado = nuevoEstado;
    if (nuevoEstado === 'completada') {
      this.fechaCompletada = new Date();
    }
  }
}

module.exports = Orden;
