// Servicio de subida de imágenes a Cloudinary desde un Buffer en memoria.
const { cloudinary, isConfigured } = require('../config/cloudinary');

// Sube un Buffer y devuelve la secure_url. Si Cloudinary no está configurado
// devuelve null (el reporte se guarda sin foto).
function uploadFromBuffer(buffer, options = {}) {
  if (!isConfigured || !buffer) {
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'reportes-sismo',
        resource_type: 'image',
        // Limita el tamaño servido para ahorrar datos sin perder evidencia.
        transformation: [{ width: 1600, height: 1600, crop: 'limit' }],
        ...options,
      },
      (err, result) => {
        if (err) return reject(err);
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

module.exports = { uploadFromBuffer };
