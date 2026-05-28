#!/usr/bin/env node

/**
 * 🚀 SCRIPT FINAL DE INICIO
 * Ejecuta la limpieza de BD e inicia el servidor
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const backendDir = path.join(__dirname);
const dbPath = path.join(backendDir, 'database.db');

console.log('\n');
console.log('╔════════════════════════════════════════════════════════════════════════╗');
console.log('║                    🚀 ECOVIDA - INICIANDO SERVIDOR                    ║');
console.log('╚════════════════════════════════════════════════════════════════════════╝\n');

// PASO 1: Eliminar BD antigua
console.log('⏳ Paso 1: Limpiando base de datos anterior...\n');
if (fs.existsSync(dbPath) && process.env.NODE_ENV !== 'production') {
  try {
    fs.unlinkSync(dbPath);
    console.log('   ✅ Base de datos anterior eliminada\n');
  } catch (err) {
    console.log('   ⚠️  No se pudo eliminar BD:', err.message, '\n');
  }
} else {
  console.log('   ✅ Conservando BD actual (o es entorno de producción)\n');
}

// PASO 2: Verificar dependencias
console.log('⏳ Paso 2: Verificando dependencias...\n');
const nodeModulesPath = path.join(backendDir, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log('   ⏳ Instalando dependencias (primera vez)...\n');
  try {
    execSync('npm install', { cwd: backendDir, stdio: 'inherit' });
    console.log('\n   ✅ Dependencias instaladas\n');
  } catch (err) {
    console.error('   ❌ Error al instalar dependencias');
    process.exit(1);
  }
} else {
  console.log('   ✅ Dependencias ya están instaladas\n');
}

// PASO 3: Iniciar servidor
console.log('═════════════════════════════════════════════════════════════════════════\n');
console.log('🌿 INICIANDO SERVIDOR EXPRESS\n');
console.log('═════════════════════════════════════════════════════════════════════════\n');

try {
  execSync('npm start', { cwd: backendDir, stdio: 'inherit' });
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
