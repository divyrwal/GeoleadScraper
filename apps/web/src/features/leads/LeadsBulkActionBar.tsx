import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckSquare, Tag, Trash2, X, Star } from "lucide-react";
import { STATUS_COLORS } from "./constants";

interface LeadsBulkActionBarProps {
    selectedIds: Set<string>;
    onClearSelection: () => void;

    bulkStatus: string;
    onBulkStatusChange: (v: string) => void;
    onApplyStatus: () => void;

    bulkTag: string;
    onBulkTagChange: (v: string) => void;
    onApplyTag: () => void;

    onDelete: () => void;
    onShortlist?: (note?: string) => void;
    isLoading: boolean;
}

export function LeadsBulkActionBar({
    selectedIds,
    onClearSelection,
    bulkStatus,
    onBulkStatusChange,
    onApplyStatus,
    bulkTag,
    onBulkTagChange,
    onApplyTag,
    onDelete,
    onShortlist,
    isLoading
}: LeadsBulkActionBarProps) {
    if (selectedIds.size === 0) return null;

    return (
        <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg animate-in fade-in duration-200">
            <Badge variant="outline" className="gap-1">
                <CheckSquare className="h-3 w-3" />{selectedIds.size} selected
            </Badge>

            <div className="flex items-center gap-2 flex-1">
                <Select value={bulkStatus} onValueChange={onBulkStatusChange}>
                    <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Set Status" /></SelectTrigger>
                    <SelectContent>
                        {Object.keys(STATUS_COLORS).filter(s => s !== 'default').map(s => (
                            <SelectItem key={s} value={s} className="text-xs capitalize">{s.replace(/_/g, " ")}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {bulkStatus && (
                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onApplyStatus} disabled={isLoading}>
                        Apply Status
                    </Button>
                )}

                <div className="h-4 w-px bg-border" />

                <Input placeholder="Add tag..." value={bulkTag} onChange={(e) => onBulkTagChange(e.target.value)}
                    className="w-[120px] h-8 text-xs" onKeyDown={(e) => { if (e.key === "Enter") onApplyTag(); }} />
                {bulkTag && (
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={onApplyTag} disabled={isLoading}>
                        <Tag className="h-3 w-3" />Add
                    </Button>
                )}

                {onShortlist && (
                    <>
                        <div className="h-4 w-px bg-border ml-2" />
                        <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 text-xs gap-1 ml-2 bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-500 dark:hover:bg-yellow-900/50"
                            onClick={() => {
                                const note = prompt("Optional short note for shortlisted leads:");
                                if (note !== null) {
                                    onShortlist(note);
                                }
                            }}
                            disabled={isLoading}
                        >
                            <Star className="h-3 w-3" />
                            Shortlist
                        </Button>
                    </>
                )}
            </div>

            <Button size="sm" variant="destructive" className="h-8 text-xs gap-1" onClick={onDelete} disabled={isLoading}>
                <Trash2 className="h-3 w-3" />Delete
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={onClearSelection}>
                <X className="h-3 w-3" />
            </Button>
        </div>
    );
}
