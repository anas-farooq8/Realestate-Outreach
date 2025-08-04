"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Download, Filter, RefreshCw } from "lucide-react"
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

  useEffect(() => {
    fetchProperties()
  }, [])

  useEffect(() => {
    let filtered = [...properties]

    if (filters.zipCode) {
      filtered = filtered.filter((p) => p.zip_code?.toLowerCase().includes(filters.zipCode.toLowerCase()))
    }

    if (filters.county) {
      filtered = filtered.filter((p) => p.county?.toLowerCase().includes(filters.county.toLowerCase()))
    }

    if (filters.dateFrom) {
      filtered = filtered.filter((p) => new Date(p.created_at) >= new Date(filters.dateFrom))
    }

    if (filters.dateTo) {
      filtered = filtered.filter((p) => new Date(p.created_at) <= new Date(filters.dateTo + "T23:59:59"))
    }

    setFilteredProperties(filtered)
  }, [properties, filters])

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      zipCode: "",
      county: "",
      dateFrom: "",
      dateTo: "",
    })
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

    try {
      const filename = `properties-${new Date().toISOString().split("T")[0]}.xlsx`
      exportToExcel(filteredProperties, filename)
      toast({
        title: "Success",
        description: `Exported ${filteredProperties.length} properties to Excel`,
      })
    } catch (error) {
      console.error("Export error:", error)
      toast({
        title: "Error",
        description: "Failed to export data",
        variant: "destructive",
      })
    }
  }

  const getUniqueValues = (key: keyof Property) => {
    const values = properties
      .map((p) => p[key])
      .filter(Boolean)
      .filter((value, index, self) => self.indexOf(value) === index)
    return values as string[]
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Properties Dashboard</h1>
              <p className="mt-2 text-gray-600">Manage and export your enriched community contact data</p>
            </div>
            <div className="flex space-x-2">
              <Button onClick={fetchProperties} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button onClick={handleExport} disabled={filteredProperties.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Export Excel
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Filter className="h-5 w-5" />
                <span>Filters</span>
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
                    onChange={(e) => handleFilterChange("zipCode", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="county">County</Label>
                  <Select value={filters.county} onValueChange={(value) => handleFilterChange("county", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select county" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Counties</SelectItem>
                      {getUniqueValues("county").map((county) => (
                        <SelectItem key={county} value={county}>
                          {county}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateFrom">Date From</Label>
                  <Input
                    id="dateFrom"
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateTo">Date To</Label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                  />
                </div>
              </div>
              <div className="mt-4">
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>

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
                  <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : filteredProperties.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No properties found. Upload some community images to get started.
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
                          <TableCell>{property.management_company || "-"}</TableCell>
                          <TableCell>{property.decision_maker_name || "-"}</TableCell>
                          <TableCell>{property.phone || "-"}</TableCell>
                          <TableCell>
                            {property.email ? (
                              <a href={`mailto:${property.email}`} className="text-blue-600 hover:underline">
                                {property.email}
                              </a>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>{property.county || "-"}</TableCell>
                          <TableCell>{property.zip_code || "-"}</TableCell>
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
