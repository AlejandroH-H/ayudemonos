// Rellena los campos ocultos lat/lng con la ubicación del navegador (opcional).
(function () {
  var btn = document.getElementById('btn-ubicacion');
  if (!btn) return;
  var estado = document.getElementById('ubicacion-estado');

  btn.addEventListener('click', function () {
    if (!navigator.geolocation) {
      estado.textContent = 'Tu navegador no permite compartir ubicación.';
      return;
    }
    estado.textContent = 'Obteniendo ubicación…';
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        document.getElementById('lat').value = pos.coords.latitude.toFixed(6);
        document.getElementById('lng').value = pos.coords.longitude.toFixed(6);
        estado.textContent = '✓ Ubicación adjuntada.';
      },
      function () {
        estado.textContent = 'No se pudo obtener la ubicación.';
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
})();
