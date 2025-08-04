"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/navbar";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Download,
  RefreshCw,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { exportToExcel } from "@/lib/excel-export";
import { useCachedProperties } from "@/hooks/use-cached-data";
import type { Property } from "@/lib/types";

const ITEMS_PER_PAGE = 20;

export default function DashboardPage() {
  // Use cached data instead of local state
  const {
    data: properties,
    loading,
    error,
    refresh: refreshProperties,
  } = useCachedProperties();

  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [paginatedProperties, setPaginatedProperties] = useState<Property[]>(
    []
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    state: "all",
    county: "all",
    city: "all",
    zipCode: "all",
    subscriptionStatus: "all",
  });

  const { toast } = useToast();

  const isSubscribed = (suspendUntil: string) => {
    const suspendDate = new Date(suspendUntil);
    const currentDate = new Date();
    return suspendDate < currentDate;
  };

  const applyFilters = () => {
    let filtered = [...properties];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (property) =>
          property.property_address
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          property.decision_maker_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          property.hoa_or_management_company
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          property.decision_maker_email
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase())
      );
    }

    // State filter
    if (filters.state !== "all") {
      filtered = filtered.filter(
        (property) =>
          property.state?.toLowerCase() === filters.state.toLowerCase()
      );
    }

    // County filter
    if (filters.county !== "all") {
      filtered = filtered.filter(
        (property) =>
          property.county?.toLowerCase() === filters.county.toLowerCase()
      );
    }

    // City filter
    if (filters.city !== "all") {
      filtered = filtered.filter(
        (property) =>
          property.city?.toLowerCase() === filters.city.toLowerCase()
      );
    }

    // Zip code filter
    if (filters.zipCode !== "all") {
      filtered = filtered.filter(
        (property) => property.zip_code === filters.zipCode
      );
    }

    // Subscription status filter
    if (filters.subscriptionStatus !== "all") {
      filtered = filtered.filter((property) => {
        if (!property.suspend_until) return false;
        const subscribed = isSubscribed(property.suspend_until);
        return filters.subscriptionStatus === "subscribed"
          ? subscribed
          : !subscribed;
      });
    }

    setFilteredProperties(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const applyPagination = () => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginated = filteredProperties.slice(startIndex, endIndex);

    setPaginatedProperties(paginated);
    setTotalPages(Math.ceil(filteredProperties.length / ITEMS_PER_PAGE));
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilters({
      state: "all",
      county: "all",
      city: "all",
      zipCode: "all",
      subscriptionStatus: "all",
    });
    setCurrentPage(1);
  };

  const handleExport = () => {
    if (filteredProperties.length === 0) {
      toast({
        title: "No Data",
        description: "No properties to export",
        variant: "destructive",
      });
      return;
    }

    const filename = `properties_${
      new Date().toISOString().split("T")[0]
    }.xlsx`;
    exportToExcel(filteredProperties, filename);

    toast({
      title: "Export Successful",
      description: `Exported ${filteredProperties.length} properties to ${filename}`,
    });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Get unique values for filter dropdowns (optimized)
  const uniqueStates = [
    ...new Set(
      properties
        .map((p) => p.state)
        .filter((state): state is string => Boolean(state))
    ),
  ].sort();
  const uniqueCounties = [
    ...new Set(
      properties
        .map((p) => p.county)
        .filter((county): county is string => Boolean(county))
    ),
  ].sort();
  const uniqueCities = [
    ...new Set(
      properties
        .map((p) => p.city)
        .filter((city): city is string => Boolean(city))
    ),
  ].sort();
  const uniqueZipCodes = [
    ...new Set(
      properties
        .map((p) => p.zip_code)
        .filter((zip): zip is string => Boolean(zip))
    ),
  ].sort();

  useEffect(() => {
    applyFilters();
  }, [searchTerm, filters, properties]);

  useEffect(() => {
    applyPagination();
  }, [filteredProperties, currentPage]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Properties Dashboard
              </h1>
              <p className="mt-2 text-gray-600">
                Manage and export your enriched property contact data
              </p>
            </div>
            <div className="flex space-x-4">
              <Button
                onClick={refreshProperties}
                variant="outline"
                disabled={loading}
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <Button
                onClick={handleExport}
                disabled={filteredProperties.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Export Excel
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Filter className="mr-2 h-5 w-5" />
                Search & Filters
              </CardTitle>
              <CardDescription>
                Search and filter properties by various criteria
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search properties, names, companies, or emails..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Select
                      value={filters.state}
                      onValueChange={(value) =>
                        setFilters({ ...filters, state: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All states" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All states</SelectItem>
                        {uniqueStates.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>County</Label>
                    <Select
                      value={filters.county}
                      onValueChange={(value) =>
                        setFilters({ ...filters, county: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All counties" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All counties</SelectItem>
                        {uniqueCounties.map((county) => (
                          <SelectItem key={county} value={county}>
                            {county}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>City</Label>
                    <Select
                      value={filters.city}
                      onValueChange={(value) =>
                        setFilters({ ...filters, city: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All cities" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All cities</SelectItem>
                        {uniqueCities.map((city) => (
                          <SelectItem key={city} value={city}>
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Zip Code</Label>
                    <Select
                      value={filters.zipCode}
                      onValueChange={(value) =>
                        setFilters({ ...filters, zipCode: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All zip codes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All zip codes</SelectItem>
                        {uniqueZipCodes.map((zipCode) => (
                          <SelectItem key={zipCode} value={zipCode}>
                            {zipCode}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Subscription Status</Label>
                    <Select
                      value={filters.subscriptionStatus}
                      onValueChange={(value) =>
                        setFilters({ ...filters, subscriptionStatus: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="subscribed">Subscribed</SelectItem>
                        <SelectItem value="unsubscribed">
                          Unsubscribed
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button onClick={clearFilters} variant="outline" size="sm">
                    Clear All Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Properties Table */}
          <Card>
            <CardHeader>
              <CardTitle>Properties ({filteredProperties.length})</CardTitle>
              <CardDescription>
                {filteredProperties.length !== properties.length &&
                  `Showing ${filteredProperties.length} of ${properties.length} properties`}
                {filteredProperties.length > ITEMS_PER_PAGE &&
                  ` • Page ${currentPage} of ${totalPages}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                  <RefreshCw className="h-8 w-8 animate-spin" />
                  <p className="text-gray-500">Loading properties...</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                  <div className="text-center">
                    <p className="text-red-600 mb-2">⚠️ {error}</p>
                    <Button onClick={refreshProperties} variant="outline">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Try Again
                    </Button>
                  </div>
                </div>
              ) : paginatedProperties.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No properties found</p>
                </div>
              ) : (
                <>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Property Name</TableHead>
                          <TableHead>HOA/Management</TableHead>
                          <TableHead>Decision Maker</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>City</TableHead>
                          <TableHead>County</TableHead>
                          <TableHead>State</TableHead>
                          <TableHead>Zip</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedProperties.map((property) => (
                          <TableRow key={property.id}>
                            <TableCell className="font-medium max-w-xs truncate">
                              {property.property_address || "—"}
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {property.hoa_or_management_company || "—"}
                            </TableCell>
                            <TableCell>
                              {property.decision_maker_name || "—"}
                            </TableCell>
                            <TableCell>
                              {property.decision_maker_email &&
                              !property.decision_maker_email.includes(
                                "noemail"
                              ) ? (
                                <a
                                  href={`mailto:${property.decision_maker_email}`}
                                  className="text-blue-600 hover:underline truncate block max-w-xs"
                                >
                                  {property.decision_maker_email}
                                </a>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell>
                              {property.decision_maker_phone || "—"}
                            </TableCell>
                            <TableCell>{property.city || "—"}</TableCell>
                            <TableCell>{property.county || "—"}</TableCell>
                            <TableCell>{property.state || "—"}</TableCell>
                            <TableCell>{property.zip_code || "—"}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  property.suspend_until &&
                                  isSubscribed(property.suspend_until)
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {property.suspend_until &&
                                isSubscribed(property.suspend_until)
                                  ? "Subscribed"
                                  : "Unsubscribed"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(
                                property.created_at
                              ).toLocaleDateString()}
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
                          filteredProperties.length
                        )}{" "}
                        of {filteredProperties.length} results
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage - 1)}
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
                                  onClick={() => handlePageChange(pageNum)}
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
                          onClick={() => handlePageChange(currentPage + 1)}
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
    </div>
  );
}
