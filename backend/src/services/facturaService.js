const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const BOLIVIA_TZ = 'America/La_Paz';

function parseStoredDate(value) {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  if (typeof value !== 'string') return new Date(value);
  const trimmed = value.trim();
  if (!trimmed) return new Date();
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(trimmed)) return new Date(trimmed);
  if (trimmed.includes('T')) return new Date(`${trimmed}Z`);
  return new Date(`${trimmed.replace(' ', 'T')}Z`);
}

function getBoliviaYear(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BOLIVIA_TZ,
    year: 'numeric'
  }).format(date);
}

function generarFacturaPDF({ orden, usuario, productos, metodoPago, logoPath }) {
  return new Promise((resolve, reject) => {
    const filenameId  = `F-${orden.id.toString().padStart(6, '0')}`;
    // Si la fecha viene de SQLite (ej. '2026-06-02 01:40:50') y no tiene 'Z', JS puede asumirla local y desfasarla.
    // Añadimos 'Z' para forzar que sea parseada como UTC (que es como SQLite la guarda por defecto).
    const fechaObj    = parseStoredDate(orden.fecha || orden.fechaPago || orden.fechaCreacion);
    const currentYear = getBoliviaYear(fechaObj);
    const formattedId = `ECO-${currentYear}-${orden.id.toString().padStart(8, '0')}`;
    const fecha = fechaObj.toLocaleDateString('es-BO', { timeZone: BOLIVIA_TZ, year:'numeric', month:'long', day:'2-digit' });
    const hora  = fechaObj.toLocaleTimeString('es-BO', { timeZone: BOLIVIA_TZ, hour:'2-digit', minute:'2-digit' });

    const pdfDir  = path.join(__dirname, '../../facturas');
    if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });
    const pdfPath = path.join(pdfDir, `${filenameId}.pdf`);

    const doc = new PDFDocument({ margin: 0, size: 'A4', info: {
      Title: `Recibo ${formattedId}`, Author: 'EcoVida Sucre'
    }});
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    const W  = 595.28;
    const ML = 40;
    const MR = W - 40;
    const CW = MR - ML;

    const metodo     = (metodoPago || orden.metodoPago || 'Efectivo').toUpperCase();
    const dirMostrar = usuario.direccion
      ? `${usuario.direccion}${usuario.ciudad ? ', ' + usuario.ciudad : ''}`
      : (orden.direccionEnvio || 'No especificada');

    // ═══════════════════════════════════════════
    // 1. CABECERA
    // ═══════════════════════════════════════════
    const hH = 115;
    doc.rect(0, 0, W, hH).fill('#1B5E20');

    // Círculos decorativos esquina derecha
    doc.circle(W + 15, -20, 90).fill('#2E7D32');
    doc.circle(W -  5,  60, 60).fill('#266329');

    // Franja dorada
    doc.rect(0, hH - 4, W, 4).fill('#F9A825');

    // Logo box dorado
    let logoRendered = false;
    if (logoPath && fs.existsSync(logoPath)) {
      try {
        doc.save().roundedRect(ML, 22, 56, 56, 10).fill('#F9A825').restore();
        doc.image(logoPath, ML + 5, 27, { width: 46, height: 46 });
        logoRendered = true;
      } catch(e) {}
    }
    if (!logoRendered) {
      doc.save().roundedRect(ML, 22, 56, 56, 10).fill('#F9A825').restore();
      doc.font('Helvetica-Bold').fontSize(28).fillColor('#1B5E20').text('E', ML + 17, 36);
    }

    // Nombre y slogan
    doc.font('Helvetica-Bold').fontSize(27).fillColor('#FFFFFF').text('EcoVida', ML + 70, 26);
    doc.font('Helvetica').fontSize(10.5).fillColor('rgba(255,255,255,0.75)')
       .text('Productos Naturales & Organicos', ML + 70, 57);

    // Contacto derecha con iconos dorados
    const cx = W - 205;

    const locIconPath = path.join(__dirname, '../../assets/icons/location.png');
    const phIconPath  = path.join(__dirname, '../../assets/icons/phone.png');
    const emIconPath  = path.join(__dirname, '../../assets/icons/email.png');

    [
      { y: 31, txt: 'Sucre, Bolivia', icon: locIconPath },
      { y: 51, txt: '+591 75442968', icon: phIconPath },
      { y: 71, txt: 'ecovida.natural1@gmail.com', icon: emIconPath },
    ].forEach(({ y, txt, icon }) => {
      if (fs.existsSync(icon)) {
        doc.image(icon, cx - 6, y - 6, { width: 12, height: 12 });
      } else {
        doc.circle(cx, y, 4.5).fill('#F9A825');
      }
      doc.font('Helvetica').fontSize(9.5).fillColor('#FFFFFF').text(txt, cx + 13, y - 4.5);
    });

    // ═══════════════════════════════════════════
    // 2. CUERPO
    // ═══════════════════════════════════════════
    doc.rect(0, hH, W, 841.89 - hH).fill('#FFFFFF');

    let cY = hH + 28;

    // RECIBO label
    doc.font('Helvetica').fontSize(9.5).fillColor('#9E9E9E').text('RECIBO', ML, cY);
    cY += 13;

    // Número grande
    doc.font('Helvetica-Bold').fontSize(25).fillColor('#1B5E20').text(formattedId, ML, cY);

    // Badge PAGADO
    const bW = 116; const bX = MR - bW;
    doc.save().roundedRect(bX, cY + 1, bW, 28, 14).fill('#E8F5E9').restore();
    doc.moveTo(bX + 17, cY + 15).lineTo(bX + 22, cY + 21).lineTo(bX + 32, cY + 9)
       .strokeColor('#2E7D32').lineWidth(2.2).stroke();
    doc.font('Helvetica-Bold').fontSize(11.5).fillColor('#2E7D32')
       .text('PAGADO', bX + 37, cY + 9);

    cY += 36;

    // Línea verde decorativa
    doc.rect(ML, cY, 38, 2.5).fill('#1B5E20');
    cY += 13;

    // Fecha / hora con iconos dibujados
    // Calendario
    doc.save().roundedRect(ML, cY, 15, 14, 2).strokeColor('#888').lineWidth(0.7).stroke().restore();
    doc.rect(ML + 3, cY - 3, 2, 5).fill('#888');
    doc.rect(ML + 10, cY - 3, 2, 5).fill('#888');
    doc.rect(ML, cY + 5, 15, 0.7).fill('#CCC');
    doc.font('Helvetica').fontSize(10).fillColor('#444').text(fecha, ML + 19, cY + 1);

    // Separador
    doc.font('Helvetica').fontSize(10).fillColor('#CCC').text('|', ML + 120, cY + 1);

    // Reloj
    doc.circle(ML + 136, cY + 7, 7).strokeColor('#888').lineWidth(0.7).stroke();
    doc.moveTo(ML + 136, cY + 3).lineTo(ML + 136, cY + 7).strokeColor('#888').lineWidth(1.2).stroke();
    doc.moveTo(ML + 136, cY + 7).lineTo(ML + 139, cY + 10).strokeColor('#888').lineWidth(1.2).stroke();
    doc.font('Helvetica').fontSize(10).fillColor('#444').text(hora, ML + 148, cY + 1);

    cY += 26;

    // ═══════════════════════════════════════════
    // 3. CAJAS CLIENTE + PAGO — altura fija amplia
    // ═══════════════════════════════════════════
    const boxW = (CW - 14) / 2;
    const b2X  = ML + boxW + 14;
    const boxH = 140;   // altura fija generosa para que entre la dirección

    // Bordes cajas
    doc.save().roundedRect(ML,  cY, boxW, boxH, 8).strokeColor('#DDDDDD').lineWidth(0.8).stroke().restore();
    doc.save().roundedRect(b2X, cY, boxW, boxH, 8).strokeColor('#DDDDDD').lineWidth(0.8).stroke().restore();

    // ── Col 1: DATOS DEL CLIENTE
    const userIconPath = path.join(__dirname, '../../assets/icons/user.png');
    if (fs.existsSync(userIconPath)) {
       doc.image(userIconPath, ML + 12, cY + 13, { width: 20, height: 20 });
    } else {
       // Icono persona en círculo verde claro (Fallback)
       doc.save().circle(ML + 22, cY + 22, 14).fill('#E8F5E9').restore();
       doc.circle(ML + 22, cY + 16, 4.5).fill('#2E7D32');
       doc.save()
          .moveTo(ML + 15, cY + 27)
          .bezierCurveTo(ML + 15, cY + 22, ML + 18, cY + 21, ML + 22, cY + 21)
          .bezierCurveTo(ML + 26, cY + 21, ML + 29, cY + 22, ML + 29, cY + 27)
          .lineTo(ML + 15, cY + 27)
          .fill('#2E7D32').restore();
    }

    doc.font('Helvetica-Bold').fontSize(9).fillColor('#2E7D32')
       .text('DATOS DEL CLIENTE', ML + 42, cY + 17);

    doc.rect(ML + 12, cY + 38, boxW - 24, 0.7).fill('#EEEEEE');

    // Nombre
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#1A1A1A')
       .text(usuario.nombre || '—', ML + 14, cY + 48);

    // Email
    doc.save().roundedRect(ML + 14, cY + 70, 12, 9, 1.5)
       .strokeColor('#AAAAAA').lineWidth(0.6).stroke().restore();
    doc.moveTo(ML + 14, cY + 70).lineTo(ML + 20, cY + 75).lineTo(ML + 26, cY + 70)
       .strokeColor('#AAAAAA').lineWidth(0.6).stroke();
    doc.font('Helvetica').fontSize(10).fillColor('#555')
       .text(usuario.email || '—', ML + 30, cY + 71);

    // Teléfono
    doc.save().roundedRect(ML + 15, cY + 90, 9, 13, 2).fill('#AAAAAA').restore();
    doc.save().roundedRect(ML + 16, cY + 91, 7, 11, 1).fill('#FFFFFF').restore();
    doc.circle(ML + 19.5, cY + 100, 1.2).fill('#AAAAAA');
    doc.font('Helvetica').fontSize(10).fillColor('#555')
       .text(usuario.telefono || '—', ML + 30, cY + 91);

    // ── Col 2: INFORMACIÓN DE PAGO
    // Icono tarjeta en círculo verde claro
    doc.save().circle(b2X + 22, cY + 22, 14).fill('#E8F5E9').restore();
    // Tarjeta (base redondeada)
    doc.save().roundedRect(b2X + 13, cY + 16, 18, 12, 2).fill('#2E7D32').restore();
    // Banda magnética (franja oscura superior)
    doc.rect(b2X + 13, cY + 19, 18, 2.5).fill('#1B5E20');
    // Chip (pequeño rectángulo dorado)
    doc.save().roundedRect(b2X + 15, cY + 23, 4, 3, 0.5).fill('#F9A825').restore();
    // Líneas del chip (detalles)
    doc.rect(b2X + 15, cY + 24, 4, 0.5).fill('#E65100');
    doc.rect(b2X + 16.5, cY + 23, 0.5, 3).fill('#E65100');

    doc.font('Helvetica-Bold').fontSize(9).fillColor('#2E7D32')
       .text('INFORMACION DE PAGO', b2X + 42, cY + 17);

    doc.rect(b2X + 12, cY + 38, boxW - 24, 0.7).fill('#EEEEEE');

    // Método
    doc.font('Helvetica').fontSize(8.5).fillColor('#9E9E9E').text('Metodo de pago', b2X + 14, cY + 46);
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#1A1A1A').text(metodo, b2X + 14, cY + 57);

    // Ciudad
    doc.font('Helvetica').fontSize(8.5).fillColor('#9E9E9E').text('Ciudad', b2X + 14, cY + 75);
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#1A1A1A')
       .text(usuario.ciudad || '—', b2X + 14, cY + 86);

    // Dirección — espacio completo hasta el borde de la caja
    doc.font('Helvetica').fontSize(8.5).fillColor('#9E9E9E').text('Direccion', b2X + 14, cY + 104);
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#1A1A1A')
       .text(dirMostrar, b2X + 14, cY + 115, { width: boxW - 28, lineBreak: true });

    cY += boxH + 20;

    // ═══════════════════════════════════════════
    // 4. TABLA PRODUCTOS
    // ═══════════════════════════════════════════
    doc.save().roundedRect(ML, cY, CW, 28, 5).fill('#1B5E20').restore();
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#FFFFFF');
    doc.text('N',           ML + 8,     cY + 9, { width: 22,  align: 'center' });
    doc.text('DESCRIPCION', ML + 36,    cY + 9);
    doc.text('CANT.',       ML + 260,   cY + 9, { width: 48,  align: 'center' });
    doc.text('P. UNIT.',    ML + 320,   cY + 9, { width: 72,  align: 'right'  });
    doc.text('SUBTOTAL',    MR - 70,    cY + 9, { width: 70,  align: 'right'  });
    cY += 32;

    productos.forEach((p, i) => {
      const rowH   = 27;
      const precio = Number(p.precio   || 0);
      const cant   = Number(p.cantidad || 0);
      const sub    = precio * cant;

      if (i % 2 === 0) {
        doc.rect(ML, cY - 4, CW, rowH).fill('#F7FCF7');
      }

      // Círculo numerado
      doc.save().circle(ML + 19, cY + 9, 12)
         .fill(i % 2 === 0 ? '#E8F5E9' : '#F0F0F0').restore();
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#2E7D32')
         .text(String(i + 1), ML + 8, cY + 5, { width: 22, align: 'center' });

      doc.font('Helvetica').fontSize(10.5).fillColor('#1A1A1A')
         .text(p.nombre || 'Producto', ML + 36, cY + 5,
           { width: 220, lineBreak: false, ellipsis: true });

      doc.fillColor('#555')
         .text(String(cant), ML + 260, cY + 5, { width: 48, align: 'center' });

      doc.fillColor('#1A1A1A')
         .text(`Bs. ${precio.toFixed(2)}`, ML + 320, cY + 5, { width: 72, align: 'right' });

      doc.font('Helvetica-Bold').fillColor('#1B5E20')
         .text(`Bs. ${sub.toFixed(2)}`, MR - 70, cY + 5, { width: 70, align: 'right' });

      cY += rowH;
    });

    doc.rect(ML, cY, CW, 0.8).fill('#DDDDDD');
    cY += 18;

    // ═══════════════════════════════════════════
    // 5. MÉTODO + TOTAL
    // ═══════════════════════════════════════════
    const mpW = 155;
    doc.save().roundedRect(ML, cY, mpW, 55, 8).fill('#F1F8F1').restore();
    doc.save().roundedRect(ML + 10, cY + 15, 26, 16, 3).fill('#2E7D32').restore();
    doc.rect(ML + 10, cY + 20, 26, 5).fill('#1B5E20');
    doc.rect(ML + 12, cY + 27, 8, 2).fill('#F9A825');
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#2E7D32')
       .text('METODO DE PAGO', ML + 42, cY + 16);
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#1B5E20')
       .text(metodo, ML + 42, cY + 29);

    // Total — verde con franja dorada arriba
    const totW = 195; const totX = MR - totW;
    doc.save().roundedRect(totX, cY, totW, 55, 8).fill('#F9A825').restore();
    doc.save().roundedRect(totX, cY + 4, totW, 51, 8).fill('#1B5E20').restore();
    doc.font('Helvetica').fontSize(9).fillColor('rgba(255,255,255,0.70)')
       .text('TOTAL PAGADO', totX, cY + 13, { width: totW, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(24).fillColor('#FFFFFF')
       .text(`Bs. ${Number(orden.total).toFixed(2)}`, totX, cY + 26, { width: totW, align: 'center' });

    cY += 72;

    // ═══════════════════════════════════════════
    // 6. NOTA
    // ═══════════════════════════════════════════
    doc.save().roundedRect(ML, cY, CW, 44, 6).fill('#FFFDE7').restore();
    doc.save().roundedRect(ML, cY, 4, 44, 3).fill('#F9A825').restore();

    [0, 7, 14].forEach(dy => {
      doc.rect(ML + 13, cY + 13 + dy, dy === 14 ? 9 : 13, 1.8).fill('#F9A825');
    });

    doc.font('Helvetica-Bold').fontSize(9).fillColor('#E65100')
       .text('NOTA:', ML + 32, cY + 12);
    doc.font('Helvetica').fontSize(9).fillColor('#795548')
       .text('Factura fiscal disponible previa solicitud con NIT.', ML + 64, cY + 12)
       .text('Conserva este recibo como comprobante valido de tu compra en EcoVida.', ML + 32, cY + 26);

    cY += 58;

    // ═══════════════════════════════════════════
    // 7. PIE — fijo al fondo de la página
    // ═══════════════════════════════════════════
    const footerH = 90;           // altura total del bloque pie
    const footerY = 841.89 - footerH;  // posición Y fija al fondo

    // Franja verde oscuro de fondo del pie
    doc.rect(0, footerY, W, footerH).fill('#F7FCF7');
    // Línea verde arriba del pie
    doc.rect(0, footerY, W, 3).fill('#1B5E20');
    // Pequeño acento dorado izquierda
    doc.rect(0, footerY, 60, 3).fill('#F9A825');

    // Línea divisora elegante con rombo central
    const lY = footerY + 16;
    doc.rect(ML, lY, CW * 0.42, 0.7).fill('#CCCCCC');
    doc.rect(ML + CW * 0.58, lY, CW * 0.42, 0.7).fill('#CCCCCC');
    // Rombo verde
    const dmX = W / 2;
    doc.save()
       .moveTo(dmX,     lY - 6)
       .lineTo(dmX + 7, lY)
       .lineTo(dmX,     lY + 6)
       .lineTo(dmX - 7, lY)
       .closePath().fill('#2E7D32').restore();

    // Frase central
    doc.font('Helvetica-Bold').fontSize(11.5).fillColor('#1B5E20')
       .text('Gracias por confiar en EcoVida!', ML, lY + 12, { width: CW, align: 'center' });

    // ── Iconos redes sociales — bien posicionados y bonitos
    const sR  = 13;
    const sCX = W / 2;
    const sG  = 34;
    const sY2 = lY + 36;

    const fbIconPath = path.join(__dirname, '../../assets/icons/facebook.png');
    const igIconPath = path.join(__dirname, '../../assets/icons/instagram.png');
    const waIconPath = path.join(__dirname, '../../assets/icons/whatsapp.png');

    // ── Facebook
    if (fs.existsSync(fbIconPath)) {
       doc.image(fbIconPath, sCX - sG - 11, sY2 - 11, { width: 22, height: 22 });
    } else {
       doc.save().circle(sCX - sG, sY2, sR).fill('#1B5E20').restore();
       doc.save()
          .moveTo(sCX - sG - 1.5, sY2 + 7)
          .lineTo(sCX - sG - 1.5, sY2 + 1)
          .lineTo(sCX - sG - 4, sY2 + 1)
          .lineTo(sCX - sG - 4, sY2 - 1.5)
          .lineTo(sCX - sG - 1.5, sY2 - 1.5)
          .lineTo(sCX - sG - 1.5, sY2 - 3.5)
          .bezierCurveTo(sCX - sG - 1.5, sY2 - 6, sCX - sG + 1, sY2 - 7, sCX - sG + 3.5, sY2 - 7)
          .lineTo(sCX - sG + 5.5, sY2 - 7)
          .lineTo(sCX - sG + 5.5, sY2 - 4.5)
          .lineTo(sCX - sG + 3.5, sY2 - 4.5)
          .bezierCurveTo(sCX - sG + 2.5, sY2 - 4.5, sCX - sG + 2, sY2 - 4, sCX - sG + 2, sY2 - 3)
          .lineTo(sCX - sG + 2, sY2 - 1.5)
          .lineTo(sCX - sG + 5.5, sY2 - 1.5)
          .lineTo(sCX - sG + 4.5, sY2 + 1)
          .lineTo(sCX - sG + 2, sY2 + 1)
          .lineTo(sCX - sG + 2, sY2 + 7)
          .fill('#FFFFFF').restore();
    }

    // ── Instagram
    if (fs.existsSync(igIconPath)) {
       doc.image(igIconPath, sCX - 11, sY2 - 11, { width: 22, height: 22 });
    } else {
       doc.save().circle(sCX, sY2, sR).fill('#1B5E20').restore();
       doc.save().roundedRect(sCX - 6, sY2 - 6, 12, 12, 3).strokeColor('#FFFFFF').lineWidth(1.5).stroke().restore();
       doc.save().circle(sCX, sY2, 3).strokeColor('#FFFFFF').lineWidth(1.5).stroke().restore();
       doc.save().circle(sCX + 3.5, sY2 - 3.5, 1).fill('#FFFFFF').restore();
    }

    // ── WhatsApp
    if (fs.existsSync(waIconPath)) {
       doc.image(waIconPath, sCX + sG - 11, sY2 - 11, { width: 22, height: 22 });
    } else {
       doc.save().circle(sCX + sG, sY2, sR).fill('#1B5E20').restore();
       doc.save().roundedRect(sCX + sG - 6, sY2 - 6, 12, 12, 6).strokeColor('#FFFFFF').lineWidth(1.2).stroke().restore();
       doc.save()
          .moveTo(sCX + sG - 4.5, sY2 + 4.5)
          .lineTo(sCX + sG - 7,   sY2 + 7)
          .lineTo(sCX + sG - 4,   sY2 + 5.5)
          .strokeColor('#FFFFFF').lineWidth(1.2).stroke().restore();
       doc.save()
          .moveTo(sCX + sG - 3, sY2 - 2)
          .bezierCurveTo(sCX + sG - 1.5, sY2 - 2, sCX + sG - 1.5, sY2 - 3, sCX + sG - 2, sY2 - 4)
          .bezierCurveTo(sCX + sG - 3, sY2 - 5, sCX + sG - 4, sY2 - 4, sCX + sG - 4, sY2 - 2)
          .bezierCurveTo(sCX + sG - 4, sY2 + 2, sCX + sG, sY2 + 4, sCX + sG + 2, sY2 + 4)
          .bezierCurveTo(sCX + sG + 4, sY2 + 4, sCX + sG + 5, sY2 + 3, sCX + sG + 4, sY2 + 2)
          .bezierCurveTo(sCX + sG + 3, sY2 + 1.5, sCX + sG + 2, sY2 + 1.5, sCX + sG + 2, sY2 + 3)
          .strokeColor('#FFFFFF').lineWidth(1).stroke().restore();
    }

    doc.end();
    stream.on('finish', () => resolve(pdfPath));
    stream.on('error', reject);
  });
}

module.exports = { generarFacturaPDF };
