import type { Request, Response } from "express";
import { LocationService } from "../services/location.service";

export class LocationController {
    static async getCountries(_req: Request, res: Response) {
        try {
            const data = LocationService.getCountries();
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, error: "Internal server error" });
        }
    }

    static async getStates(req: Request, res: Response) {
        try {
            const countryCode = req.params.countryCode as string;
            const data = LocationService.getStates(countryCode);
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, error: "Internal server error" });
        }
    }

    static async getCities(req: Request, res: Response) {
        try {
            const countryCode = req.params.countryCode as string;
            const stateCode = req.params.stateCode as string;
            const data = LocationService.getCities(countryCode, stateCode);
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, error: "Internal server error" });
        }
    }
}
