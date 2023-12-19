import maplibregl, { Map } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import mlcontour from 'maplibre-contour';

const map = new Map({
    container: 'app',
    style: {
        version: 8,
        glyphs: 'https://mierune.github.io/fonts/{fontstack}/{range}.pbf',
        sources: {
            osm: {
                type: 'raster',
                tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
                tileSize: 256,
            },
        },
        layers: [
            {
                id: 'osm',
                type: 'raster',
                source: 'osm',
            },
        ],
    },
    center: [138.72777777777777, 35.36222222222222], // Mt.fuji
    zoom: 12,
});

const demSource = new mlcontour.DemSource({
    url: 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
    encoding: 'terrarium', // "mapbox" or "terrarium" default="terrarium"
    maxzoom: 13,
    worker: true, // offload isoline computation to a web worker to reduce jank
    cacheSize: 100, // number of most-recent tiles to cache
    timeoutMs: 10_000, // timeout on fetch requests
});
demSource.setupMaplibre(maplibregl);

map.on('load', () => {
    map.addSource('contour-source', {
        type: 'vector',
        tiles: [
            demSource.contourProtocolUrl({
                // convert meters to feet, default=1 for meters
                multiplier: 3.28084,
                thresholds: {
                    // zoom: [minor, major]
                    11: [200, 1000],
                    12: [100, 500],
                    14: [50, 200],
                    15: [20, 100],
                },
                // optional, override vector tile parameters:
                contourLayer: 'contours',
                elevationKey: 'ele',
                levelKey: 'level',
                extent: 4096,
                buffer: 1,
            }),
        ],
        maxzoom: 15,
    });

    map.addLayer({
        id: 'contour-lines',
        type: 'line',
        source: 'contour-source',
        'source-layer': 'contours',
        paint: {
            'line-color': 'rgba(255,0,60, 100%)',
            // level = highest index in thresholds array the elevation is a multiple of
            'line-width': ['match', ['get', 'level'], 1, 1, 0.5],
        },
    });
    map.addLayer({
        id: 'contour-labels',
        type: 'symbol',
        source: 'contour-source',
        'source-layer': 'contours',
        filter: ['>', ['get', 'level'], 0],
        layout: {
            'symbol-placement': 'line',
            'text-size': 10,
            'text-field': [
                'concat',
                ['number-format', ['get', 'ele'], {}],
                "'",
            ],
            'text-font': ['Noto Sans Bold'],
        },
        paint: {
            'text-halo-color': 'white',
            'text-halo-width': 1,
        },
    });
});
