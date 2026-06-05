class Orden {
  constructor(usuarioId, productos, total, direccionEnvio, metodoPago = 'contraentrega') {
    this.usuarioId      = usuarioId;
    this.productos      = productos; // Array de {productoId, nombre, cantidad, precio}
    this.total          = total;
    this.direccionEnvio = direccionEnvio;
    this.metodoPago     = metodoPago;
    this.estado         = 'pendiente'; // pendiente, confirmada, enviado, entregado, completada, cancelada
    this.estadoPago     = 'pendiente'; // pendiente, pagado
    this.fechaPago      = null;
    this.paypalOrderId  = null;        // ID de orden PayPal (si aplica)
    this.numeroSeguimiento = null;
    this.fechaCreacion  = new Date();
    this.fechaConfirmada = null;
    this.fechaEnviada = null;
    this.fechaEntregaReportada = null;
    this.fechaEntregada = null;
    this.fechaCompletada = null;
  }

  actualizarEstado(nuevoEstado) {
    this.estado = nuevoEstado;
    const campoFecha = {
      confirmada: 'fechaConfirmada',
      enviado: 'fechaEnviada',
      entrega_reportada: 'fechaEntregaReportada', // Legacy
      entregado: 'fechaEntregada',
      completada: 'fechaCompletada'
    }[nuevoEstado];
    if (campoFecha) this[campoFecha] = new Date();
  }
}

module.exports = Orden;
