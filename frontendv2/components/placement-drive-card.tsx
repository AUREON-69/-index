"use client";

import * as React from "react";
import { Building2, Calendar, DollarSign, MapPin, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { PlacementDrive } from "@/lib/api";

interface PlacementDriveCardProps {
  drive: PlacementDrive;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  onClick?: (id: number) => void;
}

export function PlacementDriveCard({ 
  drive, 
  onEdit, 
  onDelete,
  onClick 
}: PlacementDriveCardProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  const statusColors = {
    "starting_soon": "bg-blue-100 text-blue-700",
    "ongoing": "bg-green-100 text-green-700", 
    "completed": "bg-gray-100 text-gray-700",
  };

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={() => onClick?.(drive.id)}
      className={cn(
        "group bg-white border rounded-xl p-6 cursor-pointer transition-all duration-200",
        isHovered ? "border-primary border-2 -m-[1px]" : "border-border border-1",
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-[20px] font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
            {drive.company}
          </h3>
          <div className="flex items-center gap-2 mt-2">
            <span className={cn(
              "px-3 py-1 rounded-full text-xs font-semibold capitalize",
              statusColors[drive.status as keyof typeof statusColors] || "bg-gray-100 text-gray-700"
            )}>
              {drive.status.replace('_', ' ')}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {drive.package && (
            <div className="bg-secondary px-3 py-1 rounded-full text-sm font-semibold border border-border flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              ₹{(drive.package / 100000).toFixed(1)}L
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2 text-sm text-muted-foreground">
        {drive.start_date && (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>
              {new Date(drive.start_date).toLocaleDateString()} - 
              {drive.end_date ? ` ${new Date(drive.end_date).toLocaleDateString()}` : " Ongoing"}
            </span>
          </div>
        )}
        
        {drive.description && (
          <div className="mt-3 text-[14px] text-foreground">
            {drive.description.substring(0, 100)}{drive.description.length > 100 ? "..." : ""}
          </div>
        )}
      </div>

      <div className="pt-4 flex justify-between">
        {onEdit && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onEdit(drive.id);
            }}
            className="text-sm font-medium text-primary hover:underline"
          >
            Edit
          </button>
        )}
        
        {onDelete && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onDelete(drive.id);
            }}
            className="text-sm font-medium text-destructive hover:underline"
          >
            Delete
          </button>
        )}
      </div>
    </motion.div>
  );
}