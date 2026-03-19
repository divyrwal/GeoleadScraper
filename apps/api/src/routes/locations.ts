import { Router } from "express";
import { LocationController } from "../controllers/location.controller";

const router: Router = Router();

router.get("/countries", LocationController.getCountries);
router.get("/countries/:countryCode/states", LocationController.getStates);
router.get("/countries/:countryCode/states/:stateCode/cities", LocationController.getCities);

export { router as locationsRouter };
