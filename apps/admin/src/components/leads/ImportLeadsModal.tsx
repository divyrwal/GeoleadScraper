"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileJson, AlertCircle, CheckCircle2, Loader2, Info, X } from "lucide-react";
import { api } from "@/lib/api";

interface ImportLeadsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onImportSuccess: () => void;
}

export default function ImportLeadsModal({ open, onOpenChange, onImportSuccess }: ImportLeadsModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<{ inserted: number; updated: number; skipped: number; total: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!open) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if (selectedFile.type !== "application/json" && !selectedFile.name.endsWith(".json")) {
                setError("Please select a valid .json file exported from the GeoLead extension.");
                setFile(null);
                return;
            }
            setFile(selectedFile);
            setError(null);
            setResult(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        setError(null);
        setResult(null);

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (!data.leads || !Array.isArray(data.leads)) {
                throw new Error("Invalid file format. The file must contain a 'leads' array.");
            }

            const response = await api.createLeads(data.leads);

            if (response.success) {
                setResult({
                    inserted: (response as any).inserted || 0,
                    updated: (response as any).updated || 0,
                    skipped: (response as any).skipped || (data.leads.length - ((response as any).inserted + (response as any).updated)),
                    total: data.leads.length
                });
                onImportSuccess();
            } else {
                throw new Error((response as any).error || "Failed to import leads.");
            }
        } catch (err: any) {
            console.error("Import error:", err);
            setError(err.message || "Failed to parse or upload file. Ensure it's a valid GeoLead export.");
        } finally {
            setUploading(false);
        }
    };

    const reset = () => {
        setFile(null);
        setResult(null);
        setError(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleClose = () => {
        onOpenChange(false);
        reset();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={handleClose} />

            {/* Modal Content */}
            <Card className="relative w-full max-w-md shadow-2xl bg-background border animate-in zoom-in-95 duration-200 overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-2 bg-muted/30">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-xl font-bold">
                            <Upload className="h-5 w-5 text-primary" />
                            Import Leads
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                            Upload a extension JSON export to sync data.
                        </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={handleClose} className="-mr-1 -mt-5">
                        <X className="h-4 w-4" />
                    </Button>
                </CardHeader>

                <CardContent className="p-6 space-y-4">
                    {!result ? (
                        <div 
                            className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all ${file ? 'border-primary bg-primary/5 shadow-inner' : 'border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/50'}`}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileChange} 
                                className="hidden" 
                                accept=".json"
                            />
                            {file ? (
                                <>
                                    <div className="p-3 bg-primary/10 rounded-full">
                                        <FileJson className="h-10 w-10 text-primary" />
                                    </div>
                                    <div className="text-center">
                                        <p className="font-semibold text-sm">{file.name}</p>
                                        <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                    <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); reset(); }} className="h-8">Change File</Button>
                                </>
                            ) : (
                                <>
                                    <div className="p-4 bg-muted rounded-full">
                                        <Upload className="h-10 w-10 text-muted-foreground/50" />
                                    </div>
                                    <div className="text-center">
                                        <p className="font-medium">Drag-and-drop or click to browse</p>
                                        <p className="text-xs text-muted-foreground mt-1 text-balance">Only .json files from Extension Buffer Explorer</p>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-5">
                            <div className="flex items-center gap-2 text-green-700 mb-4">
                                <CheckCircle2 className="h-5 w-5 fill-green-500 text-white" />
                                <span className="font-bold">Successfully Synchronized</span>
                            </div>
                            <div className="grid grid-cols-2 gap-y-2 text-sm">
                                <span className="text-muted-foreground">Total records found:</span> <span className="text-right font-medium">{result.total}</span>
                                <span className="text-muted-foreground">New leads stored:</span> <span className="text-right font-bold text-green-600">{result.inserted}</span>
                                <span className="text-muted-foreground">Updated existing:</span> <span className="text-right font-medium">{result.updated}</span>
                                <span className="text-muted-foreground">Duplicates ignored:</span> <span className="text-right text-muted-foreground">{result.skipped}</span>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
                            <div className="text-sm">
                                <p className="font-bold text-destructive">Import Interrupted</p>
                                <p className="text-destructive/90 mt-0.5">{error}</p>
                            </div>
                        </div>
                    )}

                    <div className="flex items-start gap-3 text-xs text-muted-foreground bg-muted/60 p-4 rounded-xl border">
                        <Info className="h-4 w-4 mt-0.5 shrink-0 text-primary/70" />
                        <p className="leading-relaxed">Our engine automatically verifies data integrity by deduplicating based on Place ID, contact details, and location fingerprinting.</p>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                        <Button variant="ghost" onClick={handleClose}>Cancel</Button>
                        {!result ? (
                            <Button onClick={handleUpload} disabled={!file || uploading} className="min-w-[140px] gap-2 shadow-lg shadow-primary/20">
                                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                Start Ingestion
                            </Button>
                        ) : (
                            <Button onClick={handleClose} className="min-w-[100px]">Done</Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
