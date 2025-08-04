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
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Download, RefreshCw, Filter, Search } from "lucide-react"
import { exportToExcel } from "@/lib/excel-export"
import type { Property } from "@/lib/types"

export default function DashboardPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filters, setFilters] = useState({
    state: "all",
    county: "all",
    city: "all",
    zipCode: "all",
    subscriptionStatus: "all",
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

      const { data, error } = await supabase.from("properties").select("*").order("created_at", { ascending: false })

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

  const isSubscribed = (suspendUntil: string) => {
    const suspendDate = new Date(suspendUntil)
    const currentDate = new Date()
    return suspendDate < currentDate
  }

  const applyFilters = () => {
    let filtered = [...properties]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (property) =>
          property.property_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          property.decision_maker_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          property.hoa_or_management_company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          property.decision_maker_email?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // State filter
    if (filters.state !== "all") {
      filtered = filtered.filter((property) => property.state?.toLowerCase() === filters.state.toLowerCase())
    }

    // County filter
    if (filters.county !== "all") {
      filtered = filtered.filter((property) => property.county?.toLowerCase() === filters.county.toLowerCase())
    }

    // City filter
    if (filters.city !== "all") {
      filtered = filtered.filter((property) => property.city?.toLowerCase() === filters.city.toLowerCase())
    }

    // Zip code filter
    if (filters.zipCode !== "all") {
      filtered = filtered.filter((property) => property.zip_code === filters.zipCode)
    }

    // Subscription status filter
    if (filters.subscriptionStatus !== "all") {
      filtered = filtered.filter((property) => {
        const subscribed = isSubscribed(property.suspend_until)
        return filters.subscriptionStatus === "subscribed" ? subscribed : !subscribed
      })
    }

    setFilteredProperties(filtered)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setFilters({
      state: "all",
      county: "all",
      city: "all",
      zipCode: "all",
      subscriptionStatus: "all",
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

  // Get unique values for filter dropdowns
  const uniqueStates = [...new Set(properties.map((p) => p.state).filter(Boolean))].sort()
  const uniqueCounties = [...new Set(properties.map((p) => p.county).filter(Boolean))].sort()
  const uniqueCities = [...new Set(properties.map((p) => p.city).filter(Boolean))].sort()
  const uniqueZipCodes = [...new Set(properties.map((p) => p.zip_code).filter(Boolean))].sort()

  useEffect(() => {
    fetchProperties()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [searchTerm, filters, properties])

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

          {/* Search and Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Filter className="mr-2 h-5 w-5" />
                Search & Filters
              </CardTitle>
              <CardDescription>Search and filter properties by various criteria</CardDescription>
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
                    <Select value={filters.state} onValueChange={(value) => setFilters({ ...filters, state: value })}>
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
                    <Select value={filters.county} onValueChange={(value) => setFilters({ ...filters, county: value })}>
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
                    <Select value={filters.city} onValueChange={(value) => setFilters({ ...filters, city: value })}>
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
                      onValueChange={(value) => setFilters({ ...filters, zipCode: value })}
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
                      onValueChange={(value) => setFilters({ ...filters, subscriptionStatus: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="subscribed">Subscribed</SelectItem>
                        <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
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
                        <TableHead>Property Address</TableHead>
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
                      {filteredProperties.map((property) => (
                        <TableRow key={property.id}>
                          <TableCell className="font-medium max-w-xs truncate">
                            {property.property_address || "—"}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {property.hoa_or_management_company || "—"}
                          </TableCell>
                          <TableCell>{property.decision_maker_name || "—"}</TableCell>
                          <TableCell>
                            {property.decision_maker_email && !property.decision_maker_email.includes("noemail") ? (
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
                          <TableCell>{property.decision_maker_phone || "—"}</TableCell>
                          <TableCell>{property.city || "—"}</TableCell>
                          <TableCell>{property.county || "—"}</TableCell>
                          <TableCell>{property.state || "—"}</TableCell>
                          <TableCell>{property.zip_code || "—"}</TableCell>
                          <TableCell>
                            <Badge variant={isSubscribed(property.suspend_until) ? "default" : "secondary"}>
                              {isSubscribed(property.suspend_until) ? "Subscribed" : "Unsubscribed"}
                            </Badge>
                          </TableCell>
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
