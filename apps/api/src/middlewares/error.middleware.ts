import { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    logger.error({ err, req: { method: req.method, url: req.url, body: req.body, query: req.query } }, "Unhandled application error");

    const statusCode = err.status || 500;
    const message = err.message || "Internal server error";

    res.status(statusCode).json({
        success: false,
        error: message
    });
};
