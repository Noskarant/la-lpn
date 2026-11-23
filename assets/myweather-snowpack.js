// Neige au sol uniquement : mêmes modèles et moteur SnowFusion que MyWeather.
// Aucune donnée thermique/LPN de la page n'est remplacée par ce module.
import { applySnowFusion, SNOWFUSION_MODELS } from 'https://noskarant.github.io/myweather/js/snowfusion.js';

const FORECAST = 'https://api.open-meteo.com/v1/forecast';
const HOURLY = 'temperature_2m,precipitation,snowfall,rain';
const CHUNK_SIZE = 3;
const REQUEST_TIMEOUT_MS = 8000;

async function fetchModelChunk(points) {
  const params = new URLSearchParams({
    latitude: points.map(p => p.lat).join(','),
    longitude: points.map(p => p.lon).join(','),
    elevation: points.map(p => p.a).join(','),
    timezone: 'auto',
    forecast_days: '2',
    hourly: HOURLY,
    models: SNOWFUSION_MODELS.join(','),
    precipitation_unit: 'mm',
    temperature_unit: 'celsius'
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(FORECAST + '?' + params, { signal: controller.signal });
    if (!response.ok) throw new Error('Prévisions SnowFusion HTTP ' + response.status);
    const payload = await response.json();
    const rows = Array.isArray(payload) ? payload : [payload];
    if (rows.length !== points.length) throw new Error('Réponse multi-altitude incomplète');
    return rows;
  } finally {
    clearTimeout(timeout);
  }
}

// S'applique à une COPIE de chaque prévision : la température, la LPN et les
// précipitations utilisées par La LPN restent strictement celles d'origine.
export async function applyMyWeatherSnowpack(docs, points) {
  if (!Array.isArray(docs) || docs.length !== points.length) return 0;
  const chunks = [];
  for (let i = 0; i < points.length; i += CHUNK_SIZE)
    chunks.push({ start: i, points: points.slice(i, i + CHUNK_SIZE) });

  const results = await Promise.allSettled(chunks.map(chunk => fetchModelChunk(chunk.points)));
  let fused = 0;
  for (let k = 0; k < chunks.length; k++) {
    if (results[k].status !== 'fulfilled') {
      console.warn('SnowFusion : groupe indisponible, hauteurs Open-Meteo conservées', results[k].reason);
      continue;
    }
    const {start} = chunks[k];
    results[k].value.forEach((models, offset) => {
      const original = docs[start + offset];
      if (!original?.hourly?.time || !original?.daily?.time) return;
      try {
        const copy = JSON.parse(JSON.stringify(original));
        // L'ensemble ECMWF est dédié aux probabilités, pas à l'épaisseur au sol.
        if (applySnowFusion(copy, models, null, null) &&
            Array.isArray(copy._snowFusionHourly) &&
            copy._snowFusionHourly.some(value => Number.isFinite(value?.depth))) {
          original._snowFusionHourly = copy._snowFusionHourly;
          fused++;
        }
      } catch (err) {
        console.warn('SnowFusion : hauteur de modèle conservée pour un point', err);
      }
    });
  }
  return fused;
}
