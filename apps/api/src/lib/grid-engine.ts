/**
 * grid-engine.ts
 *
 * Converts a human-readable location into geographic coordinates,
 * determines its bounding box, and slices it into a smaller grid of sub-coordinates
 * to power Deep Scan scraping and bypass Google Maps 120-result limits.
 */

import { broadcastLog } from "./job-events";

export interface GeoCoordinate {
    lat: number;
    lng: number;
}

export interface BoundingBox {
    south: number;
    north: number;
    west: number;
    east: number;
}

export interface GridZone {
    center: GeoCoordinate;
    label: string;
}

/**
 * Uses the free OpenStreetMap Nominatim API to get location coordinates and its bounding box.
 * Note: Nominatim requires a user-agent and has rate limits (1 request/sec).
 */
export async function geocodeLocation(location: string, jobId: string): Promise<{ center: GeoCoordinate, box: BoundingBox } | null> {
    try {
        broadcastLog(jobId, 'info', `[GridEngine] Geocoding location: "${location}"...`);
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'GeoLead-Grid-Scraper/1.0'
            }
        });

        if (!response.ok) {
            throw new Error(`Nominatim API returned ${response.status}`);
        }

        const data = await response.json();

        if (!data || data.length === 0) {
            broadcastLog(jobId, 'warn', `[GridEngine] Could not find geographic coordinates for "${location}". Falling back to basic search.`);
            return null;
        }

        const result = data[0];
        // boundingbox: ["south Lat", "north Lat", "west Lon", "east Lon"]
        const boxArr = result.boundingbox.map(Number);

        return {
            center: {
                lat: Number(result.lat),
                lng: Number(result.lon)
            },
            box: {
                south: boxArr[0],
                north: boxArr[1],
                west: boxArr[2],
                east: boxArr[3]
            }
        };
    } catch (error: any) {
        broadcastLog(jobId, 'error', `[GridEngine] Geocoding failed: ${error.message}`);
        return null;
    }
}

/**
 * Slices a geographical bounding box into a grid and returns the center coordinates
 * of each sub-zone.
 * 
 * @param box The geographical bounding box
 * @param gridSize N for an NxN grid (default 3 means 9 zones)
 */
export function generateGridFromBox(box: BoundingBox, locationName: string, gridSize: number = 3, jobId: string): GridZone[] {
    broadcastLog(jobId, 'info', `[GridEngine] Slicing bounding box into a ${gridSize}x${gridSize} grid...`);

    // Pad the bounding box by 10% to capture businesses at city edges
    const latRange = box.north - box.south;
    const lngRange = box.east - box.west;
    const padLat = latRange * 0.10;
    const padLng = lngRange * 0.10;

    const paddedBox = {
        south: box.south - padLat,
        north: box.north + padLat,
        west: box.west - padLng,
        east: box.east + padLng,
    };

    broadcastLog(jobId, 'info', `[GridEngine] Original bbox: ${latRange.toFixed(4)}° lat × ${lngRange.toFixed(4)}° lng → Padded +10%`);

    const zones: GridZone[] = [];
    const latStep = (paddedBox.north - paddedBox.south) / gridSize;
    const lngStep = (paddedBox.east - paddedBox.west) / gridSize;

    // Start from the top-left (North-West) and work down to bottom-right
    let zoneCounter = 1;
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            // Find the center of this specific sub-square
            const cellCenterLat = paddedBox.north - (row * latStep) - (latStep / 2);
            const cellCenterLng = paddedBox.west + (col * lngStep) + (lngStep / 2);

            zones.push({
                center: { lat: cellCenterLat, lng: cellCenterLng },
                label: `Zone ${zoneCounter} near ${cellCenterLat.toFixed(5)}, ${cellCenterLng.toFixed(5)}`
            });
            zoneCounter++;
        }
    }

    broadcastLog(jobId, 'success', `[GridEngine] Generated ${zones.length} search zones for ${locationName}.`);
    return zones;
}
