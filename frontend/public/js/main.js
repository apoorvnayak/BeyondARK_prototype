// ---- Mapbox integration (Integrated Map Feature) ----
// Reads config injected by the experience-detail view into #map-config.
(function initMap() {
  const cfgEl = document.getElementById("map-config");
  if (!cfgEl) return;

  const { token, lat, lng, name } = JSON.parse(cfgEl.textContent);
  const mapEl = document.getElementById("map");
  if (!mapEl) return;

  if (!token || !lat || !lng) {
    mapEl.parentElement.innerHTML =
      '<div class="map-fallback">Map preview unavailable — add a MAPBOX_TOKEN in .env and a location lat/lng to enable it.</div>';
    return;
  }

  const script = document.createElement("script");
  script.src = "https://api.mapbox.com/mapbox-gl-js/v3.6.0/mapbox-gl.js";
  script.onload = () => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://api.mapbox.com/mapbox-gl-js/v3.6.0/mapbox-gl.css";
    document.head.appendChild(link);

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: "map",
      style: "mapbox://styles/mapbox/light-v11",
      center: [lng, lat],
      zoom: 12,
    });
    new mapboxgl.Marker({ color: "#A63D40" }).setLngLat([lng, lat]).setPopup(new mapboxgl.Popup().setText(name)).addTo(map);
  };
  document.body.appendChild(script);
})();

// ---- Simple star-rating input (Ratings & Reviews) ----
document.querySelectorAll(".star-input").forEach((wrap) => {
  const input = wrap.querySelector('input[type="hidden"]');
  const stars = Array.from(wrap.querySelectorAll(".star"));
  stars.forEach((star, idx) => {
    star.addEventListener("click", () => {
      input.value = idx + 1;
      stars.forEach((s, i) => s.classList.toggle("filled", i <= idx));
    });
  });
});
