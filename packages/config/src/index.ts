// Env vars are loaded by each app's own dotenv setup

export const config = {
    db: {
        uri: (process.env.MONGODB_URI || "mongodb://admin:adminpassword@localhost:27017/geolead_db?authSource=admin").trim(),
        name: process.env.MONGODB_DB_NAME || "geolead_db",
    },
    ollama: {
        host: process.env.OLLAMA_HOST || "http://127.0.0.1:11434",
        model: process.env.OLLAMA_MODEL || "qwen2.5:7b",
    },
    api: {
        port: parseInt(process.env.API_PORT || "4000"),
        corsOrigins: (process.env.CORS_ORIGINS || "http://localhost:3000").split(","),
    },
    app: {
        apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
        pageSize: parseInt(process.env.DEFAULT_PAGE_SIZE || "25"),
    },
} as const;
