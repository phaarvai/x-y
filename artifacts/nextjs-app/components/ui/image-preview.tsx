"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type ImagePreviewProps = {
  src: string;
  alt?: string;
  onRemove?: () => void;
  className?: string;
  imageClassName?: string;
};

export function ImagePreview({ src, alt = "Preview", onRemove, className, imageClassName }: ImagePreviewProps) {
  return (
    <div className={cn("relative inline-block rounded-lg border overflow-hidden bg-muted", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className={cn("h-32 w-full object-cover", imageClassName)} />
      {onRemove && (
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="absolute top-2 right-2 h-7 w-7"
          aria-label="Remove image"
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
