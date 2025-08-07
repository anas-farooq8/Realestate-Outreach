"use client";

import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ImageIcon, Trash2, Edit2, Check, X, Plus } from "lucide-react";
import type { ExtractedProperty } from "@/lib/types";

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [extractedProperties, setExtractedProperties] = useState<
    ExtractedProperty[]
  >([]);
  const [parentAddress, setParentAddress] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");

  const { toast } = useToast();
  const router = useRouter();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File",
        description: "Please select an image file (JPEG or PNG)",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Reset previous extraction
    setExtractedProperties([]);
    setParentAddress("");
  };

  const handleExtractNames = async () => {
    if (!selectedFile) {
      toast({
        title: "No Image",
        description: "Please select an image first",
        variant: "destructive",
      });
      return;
    }

    setIsExtracting(true);
    try {
      const formData = new FormData();
      formData.append("image", selectedFile);

      const response = await fetch("/api/extract-names", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to extract names");
      }

      if (data.names?.length > 0) {
        const properties = data.names.map((name: string, index: number) => ({
          id: `property-${index}`,
          name: name.trim(),
          editable: false,
        }));
        setExtractedProperties(properties);
        toast({
          title: "Success",
          description: `Extracted ${properties.length} property names`,
        });
      } else {
        toast({
          title: "No Names Found",
          description: "No property names could be extracted from this image",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error extracting names:", error);
      toast({
        title: "Extraction Failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to extract property names",
        variant: "destructive",
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleEditProperty = (id: string, currentName: string) => {
    setEditingId(id);
    setEditingValue(currentName);
  };

  const handleSaveEdit = (id: string) => {
    if (editingValue.trim()) {
      setExtractedProperties((prev) =>
        prev.map((property) =>
          property.id === id
            ? { ...property, name: editingValue.trim() }
            : property
        )
      );
    }
    setEditingId(null);
    setEditingValue("");
  };

  const handleCancelEdit = (propertyId?: string) => {
    if (propertyId) {
      const property = extractedProperties.find((p) => p.id === propertyId);
      if (property?.name === "New Property") {
        handleRemoveProperty(propertyId);
        setEditingId(null);
        setEditingValue("");
        return;
      }
    }
    setEditingId(null);
    setEditingValue("");
  };

  const handleRemoveProperty = (id: string) => {
    setExtractedProperties((prev) =>
      prev.filter((property) => property.id !== id)
    );
  };

  const handleAddProperty = () => {
    const newProperty: ExtractedProperty = {
      id: `property-${Date.now()}`,
      name: "New Property",
      editable: false,
    };
    setExtractedProperties((prev) => [...prev, newProperty]);
    handleEditProperty(newProperty.id, newProperty.name);
  };

  const handleProcessProperties = async () => {
    if (extractedProperties.length === 0) {
      toast({
        title: "No Properties",
        description: "Please extract property names first",
        variant: "destructive",
      });
      return;
    }

    if (!parentAddress.trim()) {
      toast({
        title: "Missing Address",
        description: "Please enter a parent address",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const propertyNames = extractedProperties.map((p) => p.name);

      const response = await fetch("/api/process-properties", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          properties: propertyNames,
          parentAddress: parentAddress.trim(),
          filename: selectedFile?.name || "uploaded-image",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to start processing");
      }

      toast({
        title: "Processing Started",
        description:
          "Your properties are being processed. You'll receive an email when complete.",
      });

      // Clear the page instead of redirecting
      setSelectedFile(null);
      setImagePreview(null);
      setExtractedProperties([]);
      setParentAddress("");

      // Reset the file input
      const fileInput = document.getElementById(
        "image-upload"
      ) as HTMLInputElement;
      if (fileInput) {
        fileInput.value = "";
      }
    } catch (error) {
      console.error("Error processing properties:", error);
      toast({
        title: "Processing Failed",
        description:
          error instanceof Error ? error.message : "Failed to start processing",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-6">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Upload Property Image
          </h1>
          <p className="mt-2 text-gray-600">
            Upload an image containing property names to extract and enrich
            contact information
          </p>
        </div>

        {/* Image Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ImageIcon className="h-5 w-5" />
              <span>Step 1: Upload Image</span>
            </CardTitle>
            <CardDescription>
              Select an image file (JPEG or PNG) containing property or
              community names
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <Label
                    htmlFor="image-upload"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Choose Image File
                  </Label>
                  <Input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="w-full cursor-pointer h-13 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    PNG, JPG up to 10MB
                  </p>
                </div>
                <Button
                  onClick={handleExtractNames}
                  disabled={!selectedFile || isExtracting}
                  variant="outline"
                >
                  {isExtracting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2" />
                      Extracting...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="mr-2 h-4 w-4" />
                      Extract Names
                    </>
                  )}
                </Button>
              </div>

              {imagePreview && (
                <div className="space-y-2">
                  <Label>Image Preview</Label>
                  <div className="border rounded-lg p-4 bg-white">
                    <img
                      src={imagePreview}
                      alt="Upload preview"
                      className="max-w-full h-auto max-h-96 mx-auto rounded shadow-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Extracted Names */}
        {extractedProperties.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Step 2: Review & Edit Property Names</CardTitle>
                  <CardDescription>
                    Review the extracted property names. You can edit or remove
                    any entries before processing.
                  </CardDescription>
                </div>
                <Button onClick={handleAddProperty} size="sm" variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Property
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-md border max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-10">
                      <TableRow>
                        <TableHead>Property Name</TableHead>
                        <TableHead className="w-32">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {extractedProperties.map((property) => (
                        <TableRow key={property.id}>
                          <TableCell>
                            {editingId === property.id ? (
                              <Input
                                value={editingValue}
                                onChange={(e) =>
                                  setEditingValue(e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter")
                                    handleSaveEdit(property.id);
                                  if (e.key === "Escape")
                                    handleCancelEdit(property.id);
                                }}
                                className="w-full"
                                autoFocus
                              />
                            ) : (
                              <span className="font-medium">
                                {property.name}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              {editingId === property.id ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleSaveEdit(property.id)}
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      handleCancelEdit(property.id)
                                    }
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      handleEditProperty(
                                        property.id,
                                        property.name
                                      )
                                    }
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      handleRemoveProperty(property.id)
                                    }
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="parent-address">Parent Address</Label>
                  <Input
                    id="parent-address"
                    placeholder="e.g., Palm Beach County, Florida"
                    value={parentAddress}
                    onChange={(e) => setParentAddress(e.target.value)}
                  />
                  <p className="text-sm text-gray-500">
                    Enter the general location (city, county, state) where these
                    properties are located
                  </p>
                </div>

                <Button
                  onClick={handleProcessProperties}
                  disabled={
                    isProcessing ||
                    extractedProperties.length === 0 ||
                    !parentAddress.trim()
                  }
                  className="w-full"
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Starting Processing...
                    </>
                  ) : (
                    `Process ${extractedProperties.length} Properties`
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
