const CAMPOS_PERFIL_REQUERIDOS = [
  { clave: 'nombre', etiqueta: 'nombre completo' },
  { clave: 'telefono', etiqueta: 'teléfono' },
  { clave: 'direccion', etiqueta: 'dirección' },
  { clave: 'ciudad', etiqueta: 'ciudad' }
];

function limpiarTexto(valor) {
  if (typeof valor !== 'string') return '';

  const texto = valor.trim();
  if (['null', 'undefined', 'nan'].includes(texto.toLowerCase())) return '';
  return texto;
}

function obtenerCamposPerfilFaltantes(usuario) {
  return CAMPOS_PERFIL_REQUERIDOS
    .filter(({ clave }) => !limpiarTexto(usuario?.[clave]))
    .map(({ etiqueta }) => etiqueta);
}

function validarPerfilCompleto(usuario) {
  const camposFaltantes = obtenerCamposPerfilFaltantes(usuario);

  return {
    completo: camposFaltantes.length === 0,
    camposFaltantes
  };
}

function crearErrorPerfilIncompleto(usuario) {
  const { completo, camposFaltantes } = validarPerfilCompleto(usuario);
  if (completo) return null;

  const error = new Error(
    `Completa tu perfil antes de pagar. Faltan: ${camposFaltantes.join(', ')}.`
  );
  error.codigo = 'PERFIL_INCOMPLETO';
  error.camposFaltantes = camposFaltantes;
  return error;
}

function normalizarDatosPerfil(datos) {
  return {
    nombre: limpiarTexto(datos?.nombre),
    telefono: limpiarTexto(datos?.telefono),
    direccion: limpiarTexto(datos?.direccion),
    ciudad: limpiarTexto(datos?.ciudad)
  };
}

module.exports = {
  crearErrorPerfilIncompleto,
  normalizarDatosPerfil,
  validarPerfilCompleto
};
