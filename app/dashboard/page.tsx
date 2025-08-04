"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { Download, RefreshCw, Filter } from "lucide-react"
import { exportToExcel } from "@/lib/excel-export"
import type { Property } from "@/lib/types"

export default function DashboardPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    zipCode: "",
    county: "",
    dateFrom: "",
    dateTo: "",
  })

  const { toast } = useToast()
  const supabase = createClient()

  const fetchProperties = async () => {
    try {
      setLoading(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("User not authenticated")
      }

      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) {
        throw error
      }

      setProperties(data || [])
      setFilteredProperties(data || [])
    } catch (error) {
      console.error("Error fetching properties:", error)
      toast({
        title: "Error",
        description: "Failed to load properties",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...properties]

    if (filters.zipCode) {
      filtered = filtered.filter((property) => property.zip_code?.toLowerCase().includes(filters.zipCode.toLowerCase()))
    }

    if (filters.county) {
      filtered = filtered.filter((property) => property.county?.toLowerCase().includes(filters.county.toLowerCase()))
    }

    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom)
      filtered = filtered.filter((property) => new Date(property.created_at) >= fromDate)
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo)
      toDate.setHours(23, 59, 59, 999) // End of day
      filtered = filtered.filter((property) => new Date(property.created_at) <= toDate)
    }

    setFilteredProperties(filtered)
  }

  const clearFilters = () => {
    setFilters({
      zipCode: "",
      county: "",
      dateFrom: "",
      dateTo: "",
    })
    setFilteredProperties(properties)
  }

  const handleExport = () => {
    if (filteredProperties.length === 0) {
      toast({
        title: "No Data",
        description: "No properties to export",
        variant: "destructive",
      })
      return
    }

    const filename = `properties_${new Date().toISOString().split("T")[0]}.xlsx`
    exportToExcel(filteredProperties, filename)

    toast({
      title: "Export Successful",
      description: `Exported ${filteredProperties.length} properties to ${filename}`,
    })
  }

  useEffect(() => {
    fetchProperties()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [filters, properties])

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Properties Dashboard</h1>
              <p className="mt-2 text-gray-600">Manage and export your enriched property contact data</p>
            </div>
            <div className="flex space-x-4">
              <Button onClick={fetchProperties} variant="outline" disabled={loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button onClick={handleExport} disabled={filteredProperties.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Export Excel
              </Button>
            </div>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Filter className="mr-2 h-5 w-5" />
                Filters
              </CardTitle>
              <CardDescription>Filter properties by location and date</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="zipCode">Zip Code</Label>
                  <Input
                    id="zipCode"
                    placeholder="Enter zip code"
                    value={filters.zipCode}
                    onChange={(e) => setFilters({ ...filters, zipCode: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="county">County</Label>
                  <Input
                    id="county"
                    placeholder="Enter county"
                    value={filters.county}
                    onChange={(e) => setFilters({ ...filters, county: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateFrom">From Date</Label>
                  <Input
                    id="dateFrom"
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateTo">To Date</Label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  />
                </div>
              </div>
              <div className="mt-4">
                <Button onClick={clearFilters} variant="outline" size="sm">
                  Clear Filters
                </Button>
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
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin" />
                </div>
              ) : filteredProperties.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No properties found</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Community Name</TableHead>
                        <TableHead>Management Company</TableHead>
                        <TableHead>Decision Maker</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>County</TableHead>
                        <TableHead>Zip Code</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProperties.map((property) => (
                        <TableRow key={property.id}>
                          <TableCell className="font-medium">{property.community_name}</TableCell>
                          <TableCell>{property.management_company || "—"}</TableCell>
                          <TableCell>{property.decision_maker_name || "—"}</TableCell>
                          <TableCell>{property.phone || "—"}</TableCell>
                          <TableCell>
                            {property.email ? (
                              <a href={`mailto:${property.email}`} className="text-blue-600 hover:underline">
                                {property.email}
                              </a>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>{property.county || "—"}</TableCell>
                          <TableCell>{property.zip_code || "—"}</TableCell>
                          <TableCell>{new Date(property.created_at).toLocaleDateString()}</TableCell>
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
    </div>
  )
}
