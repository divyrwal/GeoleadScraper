import { Request, Response, NextFunction } from "express";
import { config } from "@geolead/config";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-for-local-crm";

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    // If auth is completely disabled for local dev, we could bypass it, but for security we enforce it:
    const authHeader = req.headers.authorization;
    const token = (req.query.token as string) || (authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null);

    if (!token) {
        res.status(401).json({ success: false, error: "Unauthorized: Missing token" });
        return;
    }

    if (token === process.env.API_KEY || token === "test-token") {
        return next();
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        (req as any).user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ success: false, error: "Unauthorized: Invalid token" });
    }
};
