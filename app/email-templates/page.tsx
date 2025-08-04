"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { useToast } from "@/hooks/use-toast"
import { Plus, Edit2, Trash2, RefreshCw, Eye, Filter } from "lucide-react"
import type { EmailTemplate } from "@/lib/types"

type FilterType = "all" | "active" | "inactive"

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [filter, setFilter] = useState<FilterType>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [formData, setFormData] = useState({
    template_name: "",
    subject: "",
    hook: "",
    body: "",
    signature: "",
    is_active: true,
  })

  const { toast } = useToast()
  const supabase = createClient()

  const ITEMS_PER_PAGE = 20

  // Memoized filtered and paginated data
  const filteredTemplates = useMemo(() => {
    let filtered = templates

    // Apply status filter
    if (filter === "active") {
      filtered = filtered.filter((template) => template.is_active)
    } else if (filter === "inactive") {
      filtered = filtered.filter((template) => !template.is_active)
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (template) =>
          template.template_name.toLowerCase().includes(search) ||
          template.subject?.toLowerCase().includes(search) ||
          template.hook?.toLowerCase().includes(search),
      )
    }

    return filtered
  }, [templates, filter, searchTerm])

  const paginatedTemplates = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredTemplates.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [filteredTemplates, currentPage])

  const totalPages = Math.ceil(filteredTemplates.length / ITEMS_PER_PAGE)

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Supabase error:", error)
        throw new Error(error.message)
      }

      setTemplates(data || [])
    } catch (error) {
      console.error("Error fetching templates:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load email templates",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [supabase, toast])

  const resetForm = () => {
    setFormData({
      template_name: "",
      subject: "",
      hook: "",
      body: "",
      signature: "",
      is_active: true,
    })
    setEditingTemplate(null)
  }

  const handleOpenDialog = (template?: EmailTemplate) => {
    if (template) {
      setEditingTemplate(template)
      setFormData({
        template_name: template.template_name,
        subject: template.subject || "",
        hook: template.hook || "",
        body: template.body,
        signature: template.signature || "",
        is_active: template.is_active,
      })
    } else {
      resetForm()
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    resetForm()
  }

  const handleSaveTemplate = async () => {
    try {
      if (!formData.template_name.trim() || !formData.body.trim()) {
        toast({
          title: "Validation Error",
          description: "Template name and body are required",
          variant: "destructive",
        })
        return
      }

      setSaving(true)

      const templateData = {
        template_name: formData.template_name.trim(),
        subject: formData.subject.trim() || null,
        hook: formData.hook.trim() || null,
        body: formData.body.trim(),
        signature: formData.signature.trim() || null,
        is_active: formData.is_active,
        updated_at: new Date().toISOString(),
      }

      let result
      if (editingTemplate) {
        // Update existing template
        result = await supabase.from("email_templates").update(templateData).eq("id", editingTemplate.id).select()
      } else {
        // Create new template
        result = await supabase
          .from("email_templates")
          .insert([
            {
              ...templateData,
              created_at: new Date().toISOString(),
            },
          ])
          .select()
      }

      if (result.error) {
        console.error("Supabase error:", result.error)
        throw new Error(result.error.message)
      }

      toast({
        title: editingTemplate ? "Template Updated" : "Template Created",
        description: `Email template has been ${editingTemplate ? "updated" : "created"} successfully`,
      })

      handleCloseDialog()

      // Optimistically update the local state instead of refetching all data
      if (editingTemplate && result.data?.[0]) {
        setTemplates((prev) => prev.map((t) => (t.id === editingTemplate.id ? result.data[0] : t)))
      } else if (result.data?.[0]) {
        setTemplates((prev) => [result.data[0], ...prev])
      }
    } catch (error) {
      console.error("Error saving template:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save email template",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTemplate = async (id: number) => {
    try {
      const { error } = await supabase.from("email_templates").delete().eq("id", id)

      if (error) {
        console.error("Supabase error:", error)
        throw new Error(error.message)
      }

      toast({
        title: "Template Deleted",
        description: "Email template has been deleted successfully",
      })

      // Optimistically update local state
      setTemplates((prev) => prev.filter((t) => t.id !== id))

      // Adjust current page if necessary
      const newFilteredCount = filteredTemplates.length - 1
      const newTotalPages = Math.ceil(newFilteredCount / ITEMS_PER_PAGE)
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages)
      }
    } catch (error) {
      console.error("Error deleting template:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete email template",
        variant: "destructive",
      })
    }
  }

  const handleToggleActive = async (id: number, isActive: boolean) => {
    try {
      const { error, data } = await supabase
        .from("email_templates")
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()

      if (error) {
        console.error("Supabase error:", error)
        throw new Error(error.message)
      }

      toast({
        title: isActive ? "Template Activated" : "Template Deactivated",
        description: `Email template has been ${isActive ? "activated" : "deactivated"}`,
      })

      // Optimistically update local state
      if (data?.[0]) {
        setTemplates((prev) => prev.map((t) => (t.id === id ? data[0] : t)))
      }
    } catch (error) {
      console.error("Error toggling template status:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update template status",
        variant: "destructive",
      })
    }
  }

  const handlePreview = (template: EmailTemplate) => {
    setPreviewTemplate(template)
    setIsPreviewOpen(true)
  }

  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter)
    setCurrentPage(1) // Reset to first page when filter changes
  }

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1) // Reset to first page when search changes
  }

  const renderPaginationItems = () => {
    const items = []
    const maxVisiblePages = 5

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink onClick={() => setCurrentPage(i)} isActive={currentPage === i} className="cursor-pointer">
              {i}
            </PaginationLink>
          </PaginationItem>,
        )
      }
    } else {
      // Always show first page
      items.push(
        <PaginationItem key={1}>
          <PaginationLink onClick={() => setCurrentPage(1)} isActive={currentPage === 1} className="cursor-pointer">
            1
          </PaginationLink>
        </PaginationItem>,
      )

      if (currentPage > 3) {
        items.push(<PaginationEllipsis key="ellipsis1" />)
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink onClick={() => setCurrentPage(i)} isActive={currentPage === i} className="cursor-pointer">
              {i}
            </PaginationLink>
          </PaginationItem>,
        )
      }

      if (currentPage < totalPages - 2) {
        items.push(<PaginationEllipsis key="ellipsis2" />)
      }

      // Always show last page
      if (totalPages > 1) {
        items.push(
          <PaginationItem key={totalPages}>
            <PaginationLink
              onClick={() => setCurrentPage(totalPages)}
              isActive={currentPage === totalPages}
              className="cursor-pointer"
            >
              {totalPages}
            </PaginationLink>
          </PaginationItem>,
        )
      }
    }

    return items
  }

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Email Templates</h1>
              <p className="mt-2 text-gray-600">Create and manage email templates for your outreach campaigns</p>
            </div>
            <div className="flex space-x-4">
              <Button onClick={fetchTemplates} variant="outline" disabled={loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                New Template
              </Button>
            </div>
          </div>

          {/* Filters and Search */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <div className="flex items-center space-x-2">
                    <Filter className="h-4 w-4 text-gray-500" />
                    <Label htmlFor="filter">Filter:</Label>
                    <Select value={filter} onValueChange={handleFilterChange}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="search">Search:</Label>
                    <Input
                      id="search"
                      placeholder="Search templates..."
                      value={searchTerm}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="w-64"
                    />
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  Showing {paginatedTemplates.length} of {filteredTemplates.length} templates
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Templates Table */}
          <Card>
            <CardHeader>
              <CardTitle>Email Templates ({filteredTemplates.length})</CardTitle>
              <CardDescription>Manage your email templates for outreach campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin" />
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    {searchTerm || filter !== "all"
                      ? "No templates match your current filters"
                      : "No email templates found"}
                  </p>
                  {!searchTerm && filter === "all" && (
                    <Button onClick={() => handleOpenDialog()} className="mt-4">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Your First Template
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Template Name</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Hook</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Updated</TableHead>
                          <TableHead className="w-32">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedTemplates.map((template) => (
                          <TableRow key={template.id}>
                            <TableCell className="font-medium max-w-xs truncate">{template.template_name}</TableCell>
                            <TableCell className="max-w-xs truncate">{template.subject || "—"}</TableCell>
                            <TableCell className="max-w-xs truncate">{template.hook || "—"}</TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Switch
                                  checked={template.is_active}
                                  onCheckedChange={(checked) => handleToggleActive(template.id, checked)}
                                />
                                <Badge variant={template.is_active ? "default" : "secondary"}>
                                  {template.is_active ? "Active" : "Inactive"}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>{new Date(template.created_at).toLocaleDateString()}</TableCell>
                            <TableCell>{new Date(template.updated_at).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button onClick={() => handlePreview(template)} size="sm" variant="outline">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button onClick={() => handleOpenDialog(template)} size="sm" variant="outline">
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button onClick={() => handleDeleteTemplate(template.id)} size="sm" variant="outline">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-6 flex justify-center">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                          {renderPaginationItems()}
                          <PaginationItem>
                            <PaginationNext
                              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                              className={
                                currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"
                              }
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create/Edit Template Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Email Template" : "Create New Email Template"}</DialogTitle>
            <DialogDescription>
              {editingTemplate ? "Update your email template" : "Create a new email template for your campaigns"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="template_name">Template Name *</Label>
              <Input
                id="template_name"
                value={formData.template_name}
                onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                placeholder="e.g., Email #1"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="subject">Subject Line</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="e.g., The Silent Reason 43% of Your Tenants Leave"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="hook">Hook</Label>
              <Textarea
                id="hook"
                value={formData.hook}
                onChange={(e) => setFormData({ ...formData, hook: e.target.value })}
                placeholder="e.g., Your Pool/Gym Won't Stop This Bleeding – But This Will"
                className="mt-1"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="body">Email Body *</Label>
              <Textarea
                id="body"
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                placeholder="Enter your email content here..."
                className="mt-1"
                rows={8}
              />
            </div>

            <div>
              <Label htmlFor="signature">Signature</Label>
              <Textarea
                id="signature"
                value={formData.signature}
                onChange={(e) => setFormData({ ...formData, signature: e.target.value })}
                placeholder="e.g., Lyndon S.\nTotal Body Mobile Massage – Outreach Team"
                className="mt-1"
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Active Template</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSaveTemplate} disabled={saving}>
              {saving ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  {editingTemplate ? "Updating..." : "Creating..."}
                </>
              ) : editingTemplate ? (
                "Update Template"
              ) : (
                "Create Template"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Template Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Template Preview</DialogTitle>
            <DialogDescription>Preview of "{previewTemplate?.template_name}"</DialogDescription>
          </DialogHeader>

          {previewTemplate && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">Subject:</Label>
                <div className="mt-1 p-3 bg-gray-50 rounded-md">{previewTemplate.subject || "No subject"}</div>
              </div>

              {previewTemplate.hook && (
                <div>
                  <Label className="text-sm font-medium text-gray-700">Hook:</Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-md">{previewTemplate.hook}</div>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium text-gray-700">Body:</Label>
                <div className="mt-1 p-3 bg-gray-50 rounded-md whitespace-pre-wrap">{previewTemplate.body}</div>
              </div>

              {previewTemplate.signature && (
                <div>
                  <Label className="text-sm font-medium text-gray-700">Signature:</Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-md whitespace-pre-wrap">{previewTemplate.signature}</div>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Badge variant={previewTemplate.is_active ? "default" : "secondary"}>
                  {previewTemplate.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                setIsPreviewOpen(false)
                handleOpenDialog(previewTemplate!)
              }}
            >
              Edit Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
