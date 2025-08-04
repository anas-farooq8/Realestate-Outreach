"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Upload, X, Edit2, Check } from "lucide-react"
import type { ExtractedCommunity } from "@/lib/types"

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [parentAddress, setParentAddress] = useState("")
  const [extractedNames, setExtractedNames] = useState<ExtractedCommunity[]>([])
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")

  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0]
      if (selectedFile) {
        if (!selectedFile.type.startsWith("image/")) {
          toast({
            title: "Invalid File",
            description: "Please select a valid image file (JPEG or PNG)",
            variant: "destructive",
          })
          return
        }

        setFile(selectedFile)
        setExtractedNames([])
        setParentAddress("")

        // Create preview URL
        const url = URL.createObjectURL(selectedFile)
        setPreviewUrl(url)
      }
    },
    [toast],
  )

  const extractNames = async () => {
    if (!file) {
      toast({
        title: "Missing File",
        description: "Please select an image first",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append("image", file)

      const response = await fetch("/api/extract-names", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to extract names")
      }

      const data = await response.json()

      // Parse the JSON response properly
      let communityNames: string[] = []

      if (Array.isArray(data.names)) {
        communityNames = data.names
      } else if (typeof data.names === "string") {
        try {
          // Try to parse if it's a JSON string
          const parsed = JSON.parse(data.names)
          if (Array.isArray(parsed)) {
            communityNames = parsed
          } else if (parsed.communities && Array.isArray(parsed.communities)) {
            communityNames = parsed.communities
          }
        } catch {
          // If parsing fails, split by common delimiters
          communityNames = data.names
            .split(/[,\n\r]+/)
            .map((name: string) => name.trim())
            .filter(Boolean)
        }
      }

      const communities: ExtractedCommunity[] = communityNames.map((name: string, index: number) => ({
        id: `${index}-${Date.now()}`,
        name: name.trim(),
        editable: false,
      }))

      setExtractedNames(communities)
      toast({
        title: "Success",
        description: `Extracted ${communities.length} community names`,
      })
    } catch (error) {
      console.error("Error extracting names:", error)
      toast({
        title: "Error",
        description: "Failed to extract community names from image",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const startEdit = (id: string, currentName: string) => {
    setEditingId(id)
    setEditValue(currentName)
  }

  const saveEdit = () => {
    if (editingId && editValue.trim()) {
      setExtractedNames((prev) =>
        prev.map((item) => (item.id === editingId ? { ...item, name: editValue.trim() } : item)),
      )
    }
    setEditingId(null)
    setEditValue("")
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditValue("")
  }

  const removeCommunity = (id: string) => {
    setExtractedNames((prev) => prev.filter((item) => item.id !== id))
  }

  const submitForProcessing = async () => {
    if (extractedNames.length === 0) {
      toast({
        title: "No Communities",
        description: "Please extract community names first",
        variant: "destructive",
      })
      return
    }

    if (!parentAddress.trim()) {
      toast({
        title: "Missing Parent Address",
        description: "Please enter a parent address",
        variant: "destructive",
      })
      return
    }

    setProcessing(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        throw new Error("User not authenticated")
      }

      const response = await fetch("/api/process-communities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          communities: extractedNames.map((c) => c.name),
          parentAddress,
          filename: file?.name || "uploaded-image",
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to start processing")
      }

      toast({
        title: "Processing Started",
        description: "Your communities are being processed. You will receive an email when complete.",
      })

      router.push("/dashboard")
    } catch (error) {
      console.error("Error starting processing:", error)
      toast({
        title: "Error",
        description: "Failed to start processing communities",
        variant: "destructive",
      })
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Upload Community Image</h1>
            <p className="mt-2 text-gray-600">
              Upload an image containing residential community names to extract and enrich contact data.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Image Upload</CardTitle>
              <CardDescription>Select a cropped image (JPEG or PNG) containing community names</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="image">Community Image</Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                />
              </div>

              {previewUrl && (
                <div className="space-y-2">
                  <Label>Image Preview</Label>
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <img
                      src={previewUrl || "/placeholder.svg"}
                      alt="Upload preview"
                      className="max-w-full h-auto max-h-64 mx-auto rounded"
                    />
                  </div>
                </div>
              )}

              <Button onClick={extractNames} disabled={!file || loading} className="w-full">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Upload className="mr-2 h-4 w-4" />
                Extract Community Names
              </Button>
            </CardContent>
          </Card>

          {extractedNames.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Extracted Communities ({extractedNames.length})</CardTitle>
                <CardDescription>
                  Review and edit the extracted community names, then provide the parent address
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Community Name</TableHead>
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {extractedNames.map((community) => (
                        <TableRow key={community.id}>
                          <TableCell>
                            {editingId === community.id ? (
                              <Input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveEdit()
                                  if (e.key === "Escape") cancelEdit()
                                }}
                                className="w-full"
                                autoFocus
                              />
                            ) : (
                              <span>{community.name}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-1">
                              {editingId === community.id ? (
                                <>
                                  <Button size="sm" variant="ghost" onClick={saveEdit}>
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={cancelEdit}>
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => startEdit(community.id, community.name)}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => removeCommunity(community.id)}>
                                    <X className="h-4 w-4" />
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

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="parentAddress">Parent Address</Label>
                    <Input
                      id="parentAddress"
                      placeholder="e.g., Palm Beach County, Florida"
                      value={parentAddress}
                      onChange={(e) => setParentAddress(e.target.value)}
                    />
                    <p className="text-sm text-gray-500">
                      Enter the general location or county where these communities are located
                    </p>
                  </div>

                  <Button
                    onClick={submitForProcessing}
                    disabled={processing || extractedNames.length === 0 || !parentAddress.trim()}
                    className="w-full"
                    size="lg"
                  >
                    {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Process Communities ({extractedNames.length})
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
