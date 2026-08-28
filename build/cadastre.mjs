/**
 * Fetch a real extract of the Geneva rooftop solar cadastre.
 *
 * The hero visual on the home page is not an illustration: it is a
 * neighbourhood of Geneva drawn from the published roof-solar dataset, each
 * roof surface coloured by the annual irradiation it actually receives. Geneva
 * is the territory Martin's solar cadastre work was built on.
 *
 * Source: Swiss Federal Office of Energy / swisstopo, "Solarenergie: Eignung
 * Dächer" (sonnendach), served by the federal geoportal api3.geo.admin.ch and
 * published as open government data.
 *
 * Run once; the result is committed. Usage: node build/cadastre.mjs
 */

import { writeFileSync } from 'node:fs';

const ENDPOINT = 'https://api3.geo.admin.ch/rest/services/api/MapServer/identify';
const LAYER = 'ch.bfe.solarenergie-eignung-daecher';
const OUTPUT = 'data/cadastre.json';

/*
 * One neighbourhood of central Geneva, roughly 450 m across. A whole city
 * would be truer to the cadastre's scale, but at hero size each roof would be
 * three pixels wide; at this extent the individual roof planes are legible,
 * which is the point of the picture.
 */
const AREA = { west: 6.1415, south: 46.2000, east: 6.1475, north: 46.2042 };

/** The API returns at most ~200 features per call, so the area is tiled. */
const TILES = 4;

/** Roofs smaller than this add noise rather than information. */
const MIN_AREA_M2 = 45;

/**
 * Ring simplification tolerance, in normalised units (the extent is 1.0 wide,
 * covering roughly 1.8 km) — so this is about 40 cm on the ground. Far below
 * what a hero-sized canvas can resolve, and it removes most of the vertices.
 */
const SIMPLIFY = 0.00022;

/** Coordinate precision kept in the shipped file: about 18 cm. */
const PRECISION = 4;

/**
 * Ramer–Douglas–Peucker: drop vertices that sit within `tolerance` of the line
 * between the points that survive around them.
 *
 * @param {number[][]} points Ring, as [x, y] pairs.
 * @param {number} tolerance  Maximum deviation to accept.
 * @returns {number[][]} The simplified ring.
 */
function simplify(points, tolerance) {
  if (points.length < 4) return points;

  const first = 0;
  const last = points.length - 1;
  const keep = new Set([first, last]);

  const stack = [[first, last]];
  while (stack.length) {
    const [start, end] = stack.pop();
    const [ax, ay] = points[start];
    const [bx, by] = points[end];
    const dx = bx - ax;
    const dy = by - ay;
    const lengthSq = dx * dx + dy * dy;

    let worst = -1;
    let worstIndex = -1;
    for (let i = start + 1; i < end; i += 1) {
      const [px, py] = points[i];
      let distSq;
      if (lengthSq === 0) {
        distSq = (px - ax) ** 2 + (py - ay) ** 2;
      } else {
        let t = ((px - ax) * dx + (py - ay) * dy) / lengthSq;
        t = Math.max(0, Math.min(1, t));
        distSq = (px - (ax + t * dx)) ** 2 + (py - (ay + t * dy)) ** 2;
      }
      if (distSq > worst) {
        worst = distSq;
        worstIndex = i;
      }
    }

    if (worstIndex !== -1 && Math.sqrt(worst) > tolerance) {
      keep.add(worstIndex);
      stack.push([start, worstIndex], [worstIndex, end]);
    }
  }

  return [...keep].sort((a, b) => a - b).map((i) => points[i]);
}

/**
 * Fetch one tile of the cadastre.
 *
 * @param {{west:number,south:number,east:number,north:number}} box Bounding box.
 * @returns {Promise<object[]>} GeoJSON-ish features.
 */
async function fetchTile(box) {
  const extent = `${box.west},${box.south},${box.east},${box.north}`;
  const url = new URL(ENDPOINT);
  const params = {
    geometry: extent,
    geometryType: 'esriGeometryEnvelope',
    layers: `all:${LAYER}`,
    geometryFormat: 'geojson',
    sr: '4326',
    tolerance: '0',
    mapExtent: extent,
    imageDisplay: '1200,1200,96',
    limit: '200',
  };
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`geo.admin.ch answered HTTP ${response.status}`);
  const body = await response.json();
  return body.results ?? [];
}

async function main() {
  console.log(`Reading the roof solar cadastre over Geneva (${TILES}×${TILES} tiles)…`);

  const seen = new Map();
  const stepX = (AREA.east - AREA.west) / TILES;
  const stepY = (AREA.north - AREA.south) / TILES;

  for (let row = 0; row < TILES; row += 1) {
    for (let col = 0; col < TILES; col += 1) {
      const box = {
        west: AREA.west + col * stepX,
        east: AREA.west + (col + 1) * stepX,
        south: AREA.south + row * stepY,
        north: AREA.south + (row + 1) * stepY,
      };
      const features = await fetchTile(box);
      for (const feature of features) {
        const id = feature.id ?? feature.featureId;
        if (id !== undefined && !seen.has(id)) seen.set(id, feature);
      }
      process.stdout.write(`\r  tiles ${row * TILES + col + 1}/${TILES * TILES} — ${seen.size} roof surfaces`);
    }
  }
  console.log();

  // Keep only what the drawing needs, and round hard: this file is shipped.
  const roofs = [];
  for (const feature of seen.values()) {
    const p = feature.properties ?? {};
    const area = Number(p.flaeche);
    const irradiation = Number(p.mstrahlung);
    if (!Number.isFinite(area) || area < MIN_AREA_M2) continue;
    if (!Number.isFinite(irradiation) || irradiation <= 0) continue;

    // Take the outer ring of the largest part of the multipolygon.
    const geometry = feature.geometry;
    if (!geometry) continue;
    const parts = geometry.type === 'MultiPolygon' ? geometry.coordinates : [geometry.coordinates];
    let ring = null;
    for (const part of parts) {
      const candidate = part?.[0];
      if (candidate && (!ring || candidate.length > ring.length)) ring = candidate;
    }
    if (!ring || ring.length < 4) continue;

    roofs.push({
      ring,
      irradiation: Math.round(irradiation),
      area: Math.round(area),
      tilt: Number.isFinite(Number(p.neigung)) ? Math.round(Number(p.neigung)) : null,
      yield: Number.isFinite(Number(p.stromertrag)) ? Math.round(Number(p.stromertrag)) : null,
    });
  }

  // Normalise to a 0–1 frame so the browser does no projection maths, and
  // correct for longitude convergence at this latitude.
  const lons = roofs.flatMap((r) => r.ring.map((c) => c[0]));
  const lats = roofs.flatMap((r) => r.ring.map((c) => c[1]));
  const west = Math.min(...lons);
  const east = Math.max(...lons);
  const south = Math.min(...lats);
  const north = Math.max(...lats);
  const midLat = (south + north) / 2;
  const scaleX = Math.cos((midLat * Math.PI) / 180);

  const spanX = (east - west) * scaleX;
  const spanY = north - south;
  const span = Math.max(spanX, spanY);

  const shapes = roofs
    .map((r) => {
      const projected = r.ring.map(([lon, lat]) => [
        ((lon - west) * scaleX) / span,
        (north - lat) / span,
      ]);
      const ring = simplify(projected, SIMPLIFY).map(([x, y]) => [
        Number(x.toFixed(PRECISION)),
        Number(y.toFixed(PRECISION)),
      ]);
      return { p: ring, i: r.irradiation, a: r.area, t: r.tilt, y: r.yield };
    })
    // Simplification can collapse a sliver into a line; drop those.
    .filter((s) => s.p.length >= 4);

  const values = shapes.map((s) => s.i).sort((a, b) => a - b);
  const output = {
    source: 'Swiss Federal Office of Energy / swisstopo — solar suitability of roofs (sonnendach), open data',
    sourceUrl: 'https://www.uvek-gis.admin.ch/BFE/sonnendach/',
    area: 'Geneva',
    unit: 'kWh/m²/year',
    fetched: new Date().toISOString().slice(0, 10),
    count: shapes.length,
    min: values[0],
    max: values.at(-1),
    median: values[Math.floor(values.length / 2)],
    extent: { spanX: Number((spanX / span).toFixed(5)), spanY: Number((spanY / span).toFixed(5)) },
    roofs: shapes,
  };

  writeFileSync(OUTPUT, `${JSON.stringify(output)}\n`);

  console.log(`  ${shapes.length} roof surfaces kept`);
  console.log(`  irradiation ${output.min}–${output.max} kWh/m²/yr, median ${output.median}`);
  console.log(`  written to ${OUTPUT}`);
}

main().catch((error) => {
  console.error(`Cadastre fetch failed: ${error.message}`);
  process.exit(1);
});
