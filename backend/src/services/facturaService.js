const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

function generarFacturaPDF({ orden, usuario, productos, metodoPago, logoPath }) {
  return new Promise((resolve, reject) => {
    const facturaId = `F-${orden.id.toString().padStart(6, '0')}`;
    const fecha = new Date(orden.fecha).toLocaleString('es-BO');
    const pdfDir = path.join(__dirname, '../../facturas');
    if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir);
    const pdfPath = path.join(pdfDir, `${facturaId}.pdf`);
    const doc = new PDFDocument({ margin: 40 });
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    // Logo
    if (logoPath && fs.existsSync(logoPath)) {
      doc.image(logoPath, 40, 40, { width: 100 });
    }
    doc.fontSize(20).text('Factura', 160, 40);
    doc.fontSize(10).text(`N°: ${facturaId}`, 400, 40);
    doc.text(`Fecha: ${fecha}`, 400, 55);
    doc.text(`Orden: ${orden.id}`, 400, 70);
    doc.moveDown();

    // Datos comprador
    doc.fontSize(12).text('Datos del comprador:', 40, 110);
    doc.fontSize(10).text(`Nombre: ${usuario.nombre}`);
    doc.text(`Email: ${usuario.email}`);
    if (orden.direccionEnvio) doc.text(`Dirección: ${orden.direccionEnvio}`);
    doc.moveDown();

    // Tabla productos
    doc.fontSize(12).text('Productos:', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);
    doc.text('Producto', 40, doc.y, { continued: true });
    doc.text('Cantidad', 200, doc.y, { continued: true });
    doc.text('Precio unit.', 270, doc.y, { continued: true });
    doc.text('Subtotal', 370, doc.y);
    doc.moveDown(0.2);
    productos.forEach(p => {
      doc.text(p.nombre, 40, doc.y, { continued: true });
      doc.text(p.cantidad.toString(), 200, doc.y, { continued: true });
      doc.text(`Bs ${p.precio.toFixed(2)}`, 270, doc.y, { continued: true });
      doc.text(`Bs ${(p.precio * p.cantidad).toFixed(2)}`, 370, doc.y);
    });
    doc.moveDown();
    doc.text(`Total pagado: Bs ${orden.total.toFixed(2)}`, 40, doc.y + 10, { bold: true });
    doc.text(`Método de pago: ${metodoPago || 'No especificado'}`, 40, doc.y + 25);
    doc.end();
    stream.on('finish', () => resolve(pdfPath));
    stream.on('error', reject);
  });
}

module.exports = { generarFacturaPDF };