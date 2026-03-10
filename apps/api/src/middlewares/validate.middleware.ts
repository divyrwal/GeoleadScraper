import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

export const validateRequest = (schema: ZodSchema, target: "body" | "query" | "params" = "body") => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const parsedValue = schema.parse(req[target]);
            if (target === "query" || target === "params") {
                // Clear existing properties safely
                for (const key in req[target]) {
                    delete (req[target] as any)[key];
                }
                Object.assign(req[target], parsedValue);
            } else {
                (req as any)[target] = parsedValue;
            }
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                res.status(400).json({ success: false, error: "Validation failed", details: (error as any).errors || (error as any).issues });
            } else {
                next(error);
            }
        }
    };
};
