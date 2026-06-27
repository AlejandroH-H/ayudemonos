// Rellena los campos ocultos lat/lng con la ubicación del navegador (opcional).
// La obtención se maneja con una Promesa y el estado se actualiza solo.
(function () {
  var btn = document.getElementById('btn-ubicacion');
  if (!btn) return;
  var estado = document.getElementById('ubicacion-estado');

  // Envuelve la API de geolocalización (basada en callbacks) en una Promesa.
  function obtenerUbicacion() {
    return new Promise(function (resolve, reject) {
      if (!navigator.geolocation) {
        reject(new Error('sin-soporte'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
      });
    });
  }

  // Animación de espera que se actualiza por sí sola mientras carga.
  var animacion = null;
  function iniciarCarga() {
    var base = 'El sistema está recaudando tu ubicación';
    var puntos = 0;
    estado.className = 'muted ubicacion-cargando';
    estado.textContent = base + '…';
    animacion = setInterval(function () {
      puntos = (puntos + 1) % 4;
      estado.textContent = base + new Array(puntos + 1).join('.');
    }, 450);
  }
  function detenerCarga() {
    if (animacion) {
      clearInterval(animacion);
      animacion = null;
    }
  }

  btn.addEventListener('click', function () {
    btn.disabled = true;
    iniciarCarga();
    obtenerUbicacion()
      .then(function (pos) {
        document.getElementById('lat').value = pos.coords.latitude.toFixed(6);
        document.getElementById('lng').value = pos.coords.longitude.toFixed(6);
        estado.className = 'muted ubicacion-ok';
        estado.textContent = '✓ Ubicación adjuntada.';
      })
      .catch(function (err) {
        estado.className = 'muted ubicacion-error';
        if (err && err.message === 'sin-soporte') {
          estado.textContent = 'Tu navegador no permite compartir ubicación.';
        } else {
          estado.textContent =
            'Aún no pudimos obtener tu ubicación. Espera un momento o vuelve a intentarlo.';
        }
      })
      .finally(function () {
        detenerCarga();
        btn.disabled = false;
      });
  });
})();
