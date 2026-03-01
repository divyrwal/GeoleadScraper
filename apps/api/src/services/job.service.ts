import { SearchOrchestrator, type SearchConfig } from "../lib/orchestrator";
import { geocodeLocation, generateGridFromBox } from "../lib/grid-engine";

export class JobService {
    static activeJobs = new Map<string, any>();

    static queueAdvancedSearch(params: any): string {
        const { query, location, radiusKm, maxResults, sources, useAiValidation, deepScan } = params;

        if (!query || !location) {
            throw new Error("Query and location are required.");
        }

        const config: SearchConfig = {
            query,
            location,
            radiusKm: radiusKm || 10,
            maxResults: maxResults || 50,
            sources: sources || {
                googleMaps: true,
                justDial: false,
                linkedIn: false,
                instagram: false
            },
            useAiValidation: useAiValidation ?? true,
            deepScan: deepScan === true
        };

        const orchestrator = new SearchOrchestrator(config);

        orchestrator.execute().then(result => {
            JobService.activeJobs.set(result.jobId, result);
        }).catch(error => {
            console.error("Background Orchestrator Job Failed:", error);
        });

        return orchestrator.jobId;
    }

    static async generateGrid(location: string, gridSizeParam: string | undefined) {
        if (!location || typeof location !== 'string') {
            throw new Error("Location query parameter is required.");
        }

        const gridSize = Math.min(5, Math.max(2, parseInt(gridSizeParam as string) || 3));
        const jobId = `grid_${Date.now()}`;

        const geoData = await geocodeLocation(location, jobId);
        if (!geoData) {
            throw new Error(`Could not find geographic coordinates for "${location}".`);
        }

        const gridZones = generateGridFromBox(geoData.box, location, gridSize, jobId);

        return {
            location: location,
            bounds: geoData.box,
            grid: gridZones.map(zone => ({
                lat: zone.center.lat,
                lng: zone.center.lng,
                label: zone.label
            }))
        };
    }
}
