"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  FileText,
  Upload,
  Trash2,
  Eye,
  ExternalLink,
} from "lucide-react";
import { useCachedPdfProposals } from "@/hooks/use-cached-data";
import type { PDFProposal } from "@/lib/types";

const ITEMS_PER_PAGE = 20;

export default function ProposalsPage() {
  const {
    data: pdfProposals,
    loading: pdfProposalsLoading,
    refresh: refreshPdfProposals,
  } = useCachedPdfProposals({ autoFetch: true, refreshOnMount: false });

  const [filteredPdfProposals, setFilteredPdfProposals] = useState<
    PDFProposal[]
  >([]);
  const [paginatedItems, setPaginatedItems] = useState<PDFProposal[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  const { toast } = useToast();

  // PDF Proposal management functions
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast({
        title: "Invalid File Type",
        description: "Please select a PDF file.",
        variant: "destructive",
      });
      return;
    }

    setUploadingPdf(true);
    try {
      const { dataCache } = await import("@/lib/cache");
      await dataCache.uploadPdfProposal(file);

      toast({
        title: "Upload Successful",
        description: `${file.name} has been uploaded successfully.`,
      });

      // Refresh the PDF proposals list
      await refreshPdfProposals();
    } catch (error) {
      console.error("Upload failed:", error);
      toast({
        title: "Upload Failed",
        description:
          error instanceof Error ? error.message : "Failed to upload PDF",
        variant: "destructive",
      });
    } finally {
      setUploadingPdf(false);
      // Reset the input
      event.target.value = "";
    }
  };

  const handleDeletePdf = async (fileName: string) => {
    try {
      const { dataCache } = await import("@/lib/cache");
      await dataCache.deletePdfProposal(fileName);

      toast({
        title: "Delete Successful",
        description: `${fileName} has been deleted successfully.`,
      });

      // Refresh the PDF proposals list
      await refreshPdfProposals();
    } catch (error) {
      console.error("Delete failed:", error);
      toast({
        title: "Delete Failed",
        description:
          error instanceof Error ? error.message : "Failed to delete PDF",
        variant: "destructive",
      });
    }
  };

  const handleViewPdf = (publicUrl: string) => {
    window.open(publicUrl, "_blank");
  };

  const applyFilters = () => {
    let filteredPdfs = [...pdfProposals];

    // Apply search filter to PDFs
    if (searchTerm) {
      filteredPdfs = filteredPdfs.filter((pdf) =>
        pdf.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredPdfProposals(filteredPdfs);
    setCurrentPage(1);
  };

  const applyPagination = () => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginated = filteredPdfProposals.slice(startIndex, endIndex);

    setPaginatedItems(paginated);
    setTotalPages(Math.ceil(filteredPdfProposals.length / ITEMS_PER_PAGE));
  };

  const handleRefresh = async () => {
    try {
      await refreshPdfProposals();
      toast({
        title: "Data Refreshed",
        description: "PDF proposals list has been updated",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description:
          error instanceof Error ? error.message : "Failed to refresh data",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    applyFilters();
  }, [searchTerm, pdfProposals]);

  useEffect(() => {
    applyPagination();
  }, [filteredPdfProposals, currentPage]);

  return (
    <div className="p-6">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">PDF Proposals</h1>
            <p className="mt-2 text-gray-600">
              Manage and view your PDF proposals and service documents
            </p>
          </div>
          <div className="flex space-x-4">
            <Button
              onClick={handleRefresh}
              variant="outline"
              disabled={pdfProposalsLoading}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${
                  pdfProposalsLoading ? "animate-spin" : ""
                }`}
              />
              Refresh
            </Button>
          </div>
        </div>

        {/* Upload and Search Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="mr-2 h-5 w-5" />
                Proposal Management
              </div>
            </CardTitle>
            <CardDescription>
              Upload, view, and manage your PDF proposal documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Upload Section */}
              <div className="flex items-center justify-between p-4 border border-dashed border-gray-300 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Upload className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    Upload new PDF proposal
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    disabled={uploadingPdf}
                    className="hidden"
                    id="pdf-upload"
                  />
                  <label
                    htmlFor="pdf-upload"
                    className={`cursor-pointer inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                      uploadingPdf ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    {uploadingPdf ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Choose PDF
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search PDF files..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PDF List */}
        <Card>
          <CardHeader>
            <CardTitle>PDF Files ({filteredPdfProposals.length})</CardTitle>
            <CardDescription>
              {filteredPdfProposals.length !== pdfProposals.length &&
                `Showing ${filteredPdfProposals.length} of ${pdfProposals.length} files`}
              {paginatedItems.length > 0 &&
                totalPages > 1 &&
                ` • Page ${currentPage} of ${totalPages}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pdfProposalsLoading ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <RefreshCw className="h-8 w-8 animate-spin" />
                <p className="text-gray-500">Loading PDF files...</p>
              </div>
            ) : paginatedItems.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  No PDF files {searchTerm ? "match your search" : "found"}
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>File Name</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Uploaded</TableHead>
                        <TableHead>Public URL</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedItems.map((pdf) => (
                        <TableRow key={pdf.name}>
                          <TableCell className="font-medium">
                            <div className="flex items-center space-x-2">
                              <FileText className="h-4 w-4 text-red-500" />
                              <span className="truncate max-w-xs">
                                {pdf.name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {(pdf.size / 1024 / 1024).toFixed(2)} MB
                          </TableCell>
                          <TableCell>
                            {new Date(pdf.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {pdf.publicUrl ? (
                              <a
                                href={pdf.publicUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline flex items-center space-x-1 truncate max-w-xs"
                              >
                                <span>View URL</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {pdf.publicUrl && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewPdf(pdf.publicUrl!)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeletePdf(pdf.name)}
                                className="text-red-600 hover:text-red-700"
                              >
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
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-gray-500">
                      Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
                      {Math.min(
                        currentPage * ITEMS_PER_PAGE,
                        filteredPdfProposals.length
                      )}{" "}
                      of {filteredPdfProposals.length} results
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>

                      <div className="flex items-center space-x-1">
                        {Array.from(
                          { length: Math.min(5, totalPages) },
                          (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }

                            return (
                              <Button
                                key={pageNum}
                                variant={
                                  currentPage === pageNum
                                    ? "default"
                                    : "outline"
                                }
                                size="sm"
                                onClick={() => setCurrentPage(pageNum)}
                                className="w-8 h-8 p-0"
                              >
                                {pageNum}
                              </Button>
                            );
                          }
                        )}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
