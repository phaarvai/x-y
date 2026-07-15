"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type SearchBarProps = {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
};

export function SearchBar({
  value,
  defaultValue = "",
  onValueChange,
  onSearch,
  placeholder = "Search...",
  className,
  autoFocus,
}: SearchBarProps) {
  const [internal, setInternal] = React.useState(defaultValue);
  const current = value ?? internal;

  const setValue = (next: string) => {
    if (value === undefined) setInternal(next);
    onValueChange?.(next);
  };

  const submit = () => onSearch?.(current);

  return (
    <div className={cn("relative flex items-center gap-2", className)}>
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={current}
          autoFocus={autoFocus}
          placeholder={placeholder}
          className="pl-9 pr-9"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />
        {current && (
          <button
            type="button"
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setValue("")}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <Button type="button" variant="secondary" onClick={submit}>
        Search
      </Button>
    </div>
  );
}
