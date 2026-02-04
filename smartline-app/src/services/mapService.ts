import axios from 'axios';

const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1Ijoic2FsYWhlenphdDEyMCIsImEiOiJjbWwyem4xMHIwaGFjM2NzYmhtNDNobmZvIn0.Q5Tm9dtAgsgsI84y4KWTUg';

export const searchPlaces = async (query: string) => {
    console.log('[Mapbox] 🔍 Requesting Geocoding API (1 Request)');
    try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&country=EG`;
        const response = await axios.get(url);
        return response.data.features;
    } catch (error) {
        console.error('Mapbox Geocoding Error:', error);
        return [];
    }
};

export const getDirections = async (start: [number, number], end: [number, number]) => {
    console.log('[Mapbox] 🛣️ Requesting Directions API (1 Request)');
    try {
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&access_token=${MAPBOX_ACCESS_TOKEN}`;
        const response = await axios.get(url);
        return response.data.routes[0];
    } catch (error) {
        console.error('Mapbox Directions Error:', error);
        return null;
    }
};
