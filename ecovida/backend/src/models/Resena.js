class Resena {
  constructor(usuarioId, productoId, calificacion, comentario = '') {
    this.usuarioId = usuarioId;
    this.productoId = productoId;
    this.calificacion = calificacion; // 1-5
    this.comentario = comentario;
    this.fechaCreacion = new Date();
  }

  esValida() {
    return this.calificacion >= 1 && this.calificacion <= 5;
  }
}

module.exports = Resena;
