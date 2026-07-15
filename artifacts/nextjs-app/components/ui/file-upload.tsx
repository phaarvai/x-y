"use client";

import * as React from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type FileUploadProps = {
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  onFilesSelected: (files: File[]) => void;
  className?: string;
  label?: string;
  hint?: string;
};

export function FileUpload({
  accept,
  multiple = false,
  disabled = false,
  onFilesSelected,
  className,
  label = "Upload files",
  hint = "Drag and drop or click to browse",
}: FileUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = React.useState(false);

  const handleFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    onFilesSelected(Array.from(list));
  };

  return (
    <div
      className={cn(
        "rounded-lg border border-dashed p-6 text-center transition-colors",
        dragOver && "border-primary bg-primary/5",
        disabled && "opacity-50 pointer-events-none",
        className,
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
    >
      <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground mt-1">{hint}</p>
      <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => inputRef.current?.click()}>
        Browse
      </Button>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
