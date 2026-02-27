import { EventEmitter } from "events";

// Create a global singleton event emitter for the search orchestrator
class JobEventEmitter extends EventEmitter {
    private logBuffer: any[] = [];
    private readonly MAX_BUFFER_SIZE = 500;

    public addLogToBuffer(log: any) {
        this.logBuffer.push(log);
        if (this.logBuffer.length > this.MAX_BUFFER_SIZE) {
            this.logBuffer.shift(); // Keep only the latest logs
        }
    }

    // Return the cached log history so new clients can catch up
    public getRecentLogs(): any[] {
        return this.logBuffer;
    }
}

export const jobEvents = new JobEventEmitter();

// Helper to easily broadcast formatted logs strings to all connected SSE clients
export function broadcastLog(jobId: string, level: 'info' | 'warn' | 'error' | 'success', message: string) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        jobId,
        level,
        message
    };

    // Also log to Node console so we don't lose the terminal debug experience
    if (level === 'error') {
        console.error(`[Job ${jobId}] ${message}`);
    } else {
        console.log(`[Job ${jobId}] ${message}`);
    }

    jobEvents.addLogToBuffer(logEntry);
    jobEvents.emit("log", logEntry);
}
