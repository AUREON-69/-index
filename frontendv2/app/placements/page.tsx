"use client";

import * as React from "react";
import { Navigation } from "@/components/navigation";
import { 
  placementDrivesApi, 
  type PlacementDrive 
} from "@/lib/api";
import { PlacementDriveCard } from "@/components/placement-drive-card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search } from "lucide-react";

export default function PlacementDrivesPage() {
  const [drives, setDrives] = React.useState<PlacementDrive[]>([]);
  const [filteredDrives, setFilteredDrives] = React.useState<PlacementDrive[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedStatus, setSelectedStatus] = React.useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingDrive, setEditingDrive] = React.useState<PlacementDrive | null>(null);
  const [formData, setFormData] = React.useState<Omit<PlacementDrive, "id">>({
    company: "",
    status: "starting_soon",
    start_date: "",
    end_date: "",
    package: undefined,
    description: "",
  });

  React.useEffect(() => {
    fetchPlacementDrives();
  }, []);

  React.useEffect(() => {
    filterDrives();
  }, [drives, searchTerm, selectedStatus]);

  const fetchPlacementDrives = async () => {
    try {
      setLoading(true);
      const data = await placementDrivesApi.getAll();
      setDrives(data);
    } catch (error) {
      console.error("Failed to fetch placement drives:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterDrives = () => {
    let result = [...drives];
    
    if (searchTerm) {
      result = result.filter(drive => 
        drive.company.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedStatus !== "all") {
      result = result.filter(drive => drive.status === selectedStatus);
    }
    
    setFilteredDrives(result);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingDrive) {
        // Update existing drive
        await placementDrivesApi.update(editingDrive.id, formData);
      } else {
        // Create new drive
        await placementDrivesApi.create(formData);
      }
      
      await fetchPlacementDrives();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Failed to save placement drive:", error);
    }
  };

  const handleEdit = (drive: PlacementDrive) => {
    setEditingDrive(drive);
    setFormData({
      company: drive.company,
      status: drive.status,
      start_date: drive.start_date || "",
      end_date: drive.end_date || "",
      package: drive.package,
      description: drive.description || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this placement drive?")) return;
    
    try {
      await placementDrivesApi.delete(id);
      await fetchPlacementDrives();
    } catch (error) {
      console.error("Failed to delete placement drive:", error);
    }
  };

  const resetForm = () => {
    setEditingDrive(null);
    setFormData({
      company: "",
      status: "starting_soon",
      start_date: "",
      end_date: "",
      package: undefined,
      description: "",
    });
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation currentPage="placements" userName="Admin User" userRole="admin" />

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <h1 className="mb-2">Placement Drives</h1>
            <p className="text-muted-foreground">
              Manage upcoming and ongoing placement drives
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={() => {
                  resetForm();
                }}
                className="px-6 py-6 font-bold text-lg"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Placement Drive
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingDrive ? "Edit Placement Drive" : "Create New Placement Drive"}
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleFormSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Company *</label>
                    <Input
                      value={formData.company}
                      onChange={(e) => handleInputChange("company", e.target.value)}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Status *</label>
                    <Select 
                      value={formData.status} 
                      onValueChange={(value) => handleInputChange("status", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="starting_soon">Starting Soon</SelectItem>
                        <SelectItem value="ongoing">Ongoing</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Start Date</label>
                    <Input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => handleInputChange("start_date", e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">End Date</label>
                    <Input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => handleInputChange("end_date", e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Package (INR)</label>
                    <Input
                      type="number"
                      value={formData.package || ""}
                      onChange={(e) => handleInputChange("package", e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="e.g., 800000"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <Textarea
                    value={formData.description || ""}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder="Enter details about the placement drive..."
                    rows={4}
                  />
                </div>
                
                <div className="flex justify-end gap-4 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsDialogOpen(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingDrive ? "Update" : "Create"} Drive
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by company name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="starting_soon">Starting Soon</SelectItem>
              <SelectItem value="ongoing">Ongoing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white border border-border rounded-xl p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-4/5"></div>
              </div>
            ))}
          </div>
        ) : filteredDrives.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
            <p className="text-lg text-muted-foreground">
              No placement drives found
            </p>
            <p className="text-muted-foreground">
              {drives.length === 0 
                ? "Create your first placement drive using the button above" 
                : "Try adjusting your search or filter criteria"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDrives.map((drive) => (
              <PlacementDriveCard
                key={drive.id}
                drive={drive}
                onEdit={() => handleEdit(drive)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}