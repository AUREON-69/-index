import * as React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Define filter types
export type StudentFilterType = "all" | "placed" | "top" | "available";

// Define filter options interface
interface FilterOption {
  value: StudentFilterType;
  label: string;
}

// Define props interface
interface StudentFilterProps {
  value: StudentFilterType;
  onValueChange: (value: StudentFilterType) => void;
  className?: string;
}

// Define available filter options
const FILTER_OPTIONS: FilterOption[] = [
  { value: "all", label: "All Students" },
  { value: "placed", label: "Placed Students" },
  { value: "top", label: "Top Students (8.5+ CGPA)" },
  { value: "available", label: "Available for Placement" },
];

export function StudentFilter({ value, onValueChange, className = "" }: StudentFilterProps) {
  return (
    <div className={`flex flex-wrap gap-4 items-center ${className}`}>
      <div className="text-[18px] font-medium text-foreground">Filter:</div>
      <div className="w-64">
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger className="h-[44px] text-[16px]">
            <SelectValue placeholder="Select filter" />
          </SelectTrigger>
          <SelectContent>
            {FILTER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export { FILTER_OPTIONS };