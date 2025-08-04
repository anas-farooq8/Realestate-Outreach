"use client"

import { useState, useEffect } from "react"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Plus, Edit2, Trash2, RefreshCw, Eye } from "lucide-react"
import type { EmailTemplate } from "@/lib/types"

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null)
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

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        throw error
      }

      setTemplates(data || [])
    } catch (error) {
      console.error("Error fetching templates:", error)
      toast({
        title: "Error",
        description: "Failed to load email templates",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

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

      const templateData = {
        template_name: formData.template_name.trim(),
        subject: formData.subject.trim() || null,
        hook: formData.hook.trim() || null,
        body: formData.body.trim(),
        signature: formData.signature.trim() || null,
        is_active: formData.is_active,
        updated_at: new Date().toISOString(),
      }

      if (editingTemplate) {
        // Update existing template
        const { error } = await supabase.from("email_templates").update(templateData).eq("id", editingTemplate.id)

        if (error) throw error

        toast({
          title: "Template Updated",
          description: "Email template has been updated successfully",
        })
      } else {
        // Create new template
        const { error } = await supabase.from("email_templates").insert([templateData])

        if (error) throw error

        toast({
          title: "Template Created",
          description: "Email template has been created successfully",
        })
      }

      handleCloseDialog()
      fetchTemplates()
    } catch (error) {
      console.error("Error saving template:", error)
      toast({
        title: "Error",
        description: "Failed to save email template",
        variant: "destructive",
      })
    }
  }

  const handleDeleteTemplate = async (id: number) => {
    try {
      const { error } = await supabase.from("email_templates").delete().eq("id", id)

      if (error) throw error

      toast({
        title: "Template Deleted",
        description: "Email template has been deleted successfully",
      })

      fetchTemplates()
    } catch (error) {
      console.error("Error deleting template:", error)
      toast({
        title: "Error",
        description: "Failed to delete email template",
        variant: "destructive",
      })
    }
  }

  const handleToggleActive = async (id: number, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("email_templates")
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq("id", id)

      if (error) throw error

      toast({
        title: isActive ? "Template Activated" : "Template Deactivated",
        description: `Email template has been ${isActive ? "activated" : "deactivated"}`,
      })

      fetchTemplates()
    } catch (error) {
      console.error("Error toggling template status:", error)
      toast({
        title: "Error",
        description: "Failed to update template status",
        variant: "destructive",
      })
    }
  }

  const handlePreview = (template: EmailTemplate) => {
    setPreviewTemplate(template)
    setIsPreviewOpen(true)
  }

  useEffect(() => {
    fetchTemplates()
  }, [])

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

          {/* Templates Table */}
          <Card>
            <CardHeader>
              <CardTitle>Email Templates ({templates.length})</CardTitle>
              <CardDescription>Manage your email templates for outreach campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin" />
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No email templates found</p>
                  <Button onClick={() => handleOpenDialog()} className="mt-4">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Template
                  </Button>
                </div>
              ) : (
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
                      {templates.map((template) => (
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
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSaveTemplate}>{editingTemplate ? "Update Template" : "Create Template"}</Button>
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
