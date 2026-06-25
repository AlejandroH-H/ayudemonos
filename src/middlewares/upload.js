// Middleware de subida de archivos con multer.
// Guarda la imagen en memoria (Buffer) para enviarla directamente a Cloudinary,
// sin escribir en disco. Acepta una sola foto opcional, máximo 5 MB.
const multer = require('multer');

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('El archivo debe ser una imagen.'));
    }
  },
});

// Un único campo "foto" opcional.
const uploadFoto = upload.single('foto');

// Envoltorio para capturar errores de multer (tamaño/tipo) y reenviarlos
// al formulario en lugar de romper la petición.
function manejarUploadFoto(req, res, next) {
  uploadFoto(req, res, (err) => {
    if (err) {
      req.uploadError =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'La imagen supera el tamaño máximo de 5 MB.'
          : err.message;
    }
    next();
  });
}

module.exports = { manejarUploadFoto };
