"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { Upload, Loader2, Edit2, Trash2, Plus } from "lucide-react"
import type { ExtractedCommunity } from "@/lib/types"

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [extractedNames, setExtractedNames] = useState<ExtractedCommunity[]>([])
  const [parentAddress, setParentAddress] = useState("")
  const [isExtracting, setIsExtracting] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showNamesList, setShowNamesList] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")

  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Validate file type
      if (!selectedFile.type.startsWith("image/")) {
        toast({
          title: "Invalid File Type",
          description: "Please select an image file (JPG, PNG, etc.)",
          variant: "destructive",
        })
        return
      }

      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select an image smaller than 10MB",
          variant: "destructive",
        })
        return
      }

      setFile(selectedFile)
    }
  }

  const handleExtractNames = async () => {
    if (!file) {
      toast({
        title: "No File Selected",
        description: "Please select an image file first",
        variant: "destructive",
      })
      return
    }

    setIsExtracting(true)

    try {
      const formData = new FormData()
      formData.append("image", file)

      const response = await fetch("/api/extract-names", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to extract names")
      }

      const data = await response.json()

      if (data.names && data.names.length > 0) {
        const communities: ExtractedCommunity[] = data.names.map((name: string, index: number) => ({
          id: `${Date.now()}-${index}`,
          name: name.trim().toUpperCase(),
          editable: true,
        }))

        setExtractedNames(communities)
        setShowNamesList(true)
        toast({
          title: "Names Extracted Successfully",
          description: `Found ${communities.length} property names`,
        })
      } else {
        toast({
          title: "No Names Found",
          description: "Could not extract any property names from the image",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error extracting names:", error)
      toast({
        title: "Extraction Failed",
        description: error.message || "Failed to extract names from image",
        variant: "destructive",
      })
    } finally {
      setIsExtracting(false)
    }
  }

  const handleEditName = (id: string, currentName: string) => {
    setEditingId(id)
    setEditingName(currentName)
  }

  const handleSaveEdit = () => {
    if (editingId && editingName.trim()) {
      setExtractedNames((prev) =>
        prev.map((item) => (item.id === editingId ? { ...item, name: editingName.trim().toUpperCase() } : item)),
      )
      setEditingId(null)
      setEditingName("")
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingName("")
  }

  const handleDeleteName = (id: string) => {
    setExtractedNames((prev) => prev.filter((item) => item.id !== id))
  }

  const handleAddName = () => {
    const newName: ExtractedCommunity = {
      id: `${Date.now()}-new`,
      name: "NEW PROPERTY",
      editable: true,
    }
    setExtractedNames((prev) => [...prev, newName])
    handleEditName(newName.id, newName.name)
  }

  const handleProcessProperties = async () => {
    if (extractedNames.length === 0) {
      toast({
        title: "No Properties",
        description: "Please extract or add property names first",
        variant: "destructive",
      })
      return
    }

    if (!parentAddress.trim()) {
      toast({
        title: "Missing Address",
        description: "Please enter the parent address",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("User not authenticated")
      }

      const propertyNames = extractedNames.map((item) => item.name)

      const response = await fetch("/api/process-properties", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          propertyNames,
          parentAddress: parentAddress.trim(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to process properties")
      }

      const result = await response.json()

      toast({
        title: "Processing Started",
        description: `Started processing ${propertyNames.length} properties. This may take a few minutes.`,
      })

      // Reset form
      setFile(null)
      setExtractedNames([])
      setParentAddress("")
      setShowNamesList(false)

      // Redirect to dashboard
      router.push("/dashboard")
    } catch (error) {
      console.error("Error processing properties:", error)
      toast({
        title: "Processing Failed",
        description: error.message || "Failed to process properties",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Upload Property Image</h1>
            <p className="mt-2 text-gray-600">Upload an image to extract property names and enrich contact data</p>
          </div>

          {/* File Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Upload Image</CardTitle>
              <CardDescription>Select an image file containing property names or community listings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-gray-400 transition-colors">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">
                      {file ? file.name : "Click to upload or drag and drop"}
                    </p>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                  </div>
                </div>

                <Button onClick={handleExtractNames} disabled={!file || isExtracting} className="w-full">
                  {isExtracting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Extracting Names...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Extract Property Names
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Extracted Names */}
          {showNamesList && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Step 2: Review & Edit Property Names
                  <Button onClick={handleAddName} size="sm" variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Property
                  </Button>
                </CardTitle>
                <CardDescription>
                  Review the extracted property names. You can edit or delete them as needed.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Property Name</TableHead>
                        <TableHead className="w-32">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {extractedNames.map((community) => (
                        <TableRow key={community.id}>
                          <TableCell>
                            {editingId === community.id ? (
                              <div className="flex space-x-2">
                                <Input
                                  value={editingName}
                                  onChange={(e) => setEditingName(e.target.value)}
                                  className="flex-1"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleSaveEdit()
                                    if (e.key === "Escape") handleCancelEdit()
                                  }}
                                  autoFocus
                                />
                                <Button onClick={handleSaveEdit} size="sm">
                                  Save
                                </Button>
                                <Button onClick={handleCancelEdit} size="sm" variant="outline">
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <span className="font-medium">{community.name}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {editingId !== community.id && (
                              <div className="flex space-x-2">
                                <Button
                                  onClick={() => handleEditName(community.id, community.name)}
                                  size="sm"
                                  variant="outline"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button onClick={() => handleDeleteName(community.id)} size="sm" variant="outline">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Parent Address Input */}
          {showNamesList && (
            <Card>
              <CardHeader>
                <CardTitle>Step 3: Enter Parent Address</CardTitle>
                <CardDescription>Provide the general location or parent address for these properties</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="parentAddress">Parent Address</Label>
                    <Input
                      id="parentAddress"
                      value={parentAddress}
                      onChange={(e) => setParentAddress(e.target.value)}
                      placeholder="e.g., Miami, FL or 123 Main St, Miami, FL"
                      className="mt-1"
                    />
                  </div>

                  <Button
                    onClick={handleProcessProperties}
                    disabled={isProcessing || extractedNames.length === 0 || !parentAddress.trim()}
                    className="w-full"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing Properties...
                      </>
                    ) : (
                      `Process ${extractedNames.length} Properties`
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
