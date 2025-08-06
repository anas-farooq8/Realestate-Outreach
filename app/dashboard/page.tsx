"use client";

import { useState, useEffect } from "react";
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
  Mail,
  Users,
  TrendingUp,
  Calendar,
  MessageSquare,
  Target,
  Clock,
} from "lucide-react";
import { exportToExcel } from "@/lib/excel-export";
import {
  useCachedProperties,
  useCachedEmailLogs,
  useCachedCampaignProgress,
  useCachedEmailTemplates,
} from "@/hooks/use-cached-data";
import type { Property, EmailLog } from "@/lib/types";

const ITEMS_PER_PAGE = 20;

export default function DashboardPage() {
  // Use cached data with optimized loading behavior
  const {
    data: properties,
    loading: propertiesLoading,
    error: propertiesError,
    refresh: refreshProperties,
  } = useCachedProperties({ autoFetch: true, refreshOnMount: false });

  const {
    data: emailLogs,
    loading: emailLogsLoading,
    refresh: refreshEmailLogs,
  } = useCachedEmailLogs({ autoFetch: true, refreshOnMount: false });

  const {
    data: campaignProgress,
    loading: campaignLoading,
    refresh: refreshCampaignProgress,
  } = useCachedCampaignProgress({ autoFetch: true, refreshOnMount: false });

  const { data: emailTemplates, refresh: refreshTemplates } =
    useCachedEmailTemplates({ autoFetch: true, refreshOnMount: false });

  const [currentView, setCurrentView] = useState<"properties" | "logs">(
    "properties"
  );
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [filteredEmailLogs, setFilteredEmailLogs] = useState<EmailLog[]>([]);
  const [paginatedItems, setPaginatedItems] = useState<(Property | EmailLog)[]>(
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
    campaignWeek: "all",
    replyStatus: "all",
    template: "all",
  });

  const { toast } = useToast();

  // Calculate dynamic stats based on filtered data
  const calculateFilteredStats = () => {
    const totalProperties = filteredProperties.length;
    const totalEmailsSent = filteredEmailLogs.length;
    const totalReplies = filteredEmailLogs.filter((log) => log.replied).length;
    const replyRate =
      totalEmailsSent > 0 ? (totalReplies / totalEmailsSent) * 100 : 0;

    return {
      totalProperties,
      totalEmailsSent,
      totalReplies,
      replyRate,
    };
  };

  const isSubscribed = (suspendUntil: string) => {
    const suspendDate = new Date(suspendUntil);
    const currentDate = new Date();
    return suspendDate < currentDate;
  };

  const applyFilters = () => {
    let filteredProps = [...properties];
    let filteredLogs = [...emailLogs];

    // Apply search filter to both properties and logs
    if (searchTerm) {
      filteredProps = filteredProps.filter(
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

      filteredLogs = filteredLogs.filter(
        (log) =>
          log.properties?.property_address
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          log.properties?.decision_maker_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          log.properties?.decision_maker_email
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          log.email_templates?.template_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase())
      );
    }

    // Apply location filters
    if (filters.state !== "all") {
      filteredProps = filteredProps.filter(
        (property) =>
          property.state?.toLowerCase() === filters.state.toLowerCase()
      );
      filteredLogs = filteredLogs.filter(
        (log) =>
          log.properties?.state?.toLowerCase() === filters.state.toLowerCase()
      );
    }

    if (filters.county !== "all") {
      filteredProps = filteredProps.filter(
        (property) =>
          property.county?.toLowerCase() === filters.county.toLowerCase()
      );
      filteredLogs = filteredLogs.filter(
        (log) =>
          log.properties?.county?.toLowerCase() === filters.county.toLowerCase()
      );
    }

    if (filters.city !== "all") {
      filteredProps = filteredProps.filter(
        (property) =>
          property.city?.toLowerCase() === filters.city.toLowerCase()
      );
      filteredLogs = filteredLogs.filter(
        (log) =>
          log.properties?.city?.toLowerCase() === filters.city.toLowerCase()
      );
    }

    if (filters.zipCode !== "all") {
      filteredProps = filteredProps.filter(
        (property) => property.zip_code === filters.zipCode
      );
      filteredLogs = filteredLogs.filter(
        (log) => log.properties?.zip_code === filters.zipCode
      );
    }

    // Apply subscription status filter
    if (filters.subscriptionStatus !== "all") {
      filteredProps = filteredProps.filter((property) => {
        if (!property.suspend_until) return false;
        const subscribed = isSubscribed(property.suspend_until);
        return filters.subscriptionStatus === "subscribed"
          ? subscribed
          : !subscribed;
      });
    }

    // Apply email-specific filters
    if (filters.campaignWeek !== "all") {
      filteredLogs = filteredLogs.filter(
        (log) => log.campaign_week === parseInt(filters.campaignWeek)
      );
    }

    if (filters.replyStatus !== "all") {
      filteredLogs = filteredLogs.filter((log) =>
        filters.replyStatus === "replied" ? log.replied : !log.replied
      );
    }

    if (filters.template !== "all") {
      filteredLogs = filteredLogs.filter(
        (log) => log.template_id === parseInt(filters.template)
      );
    }

    setFilteredProperties(filteredProps);
    setFilteredEmailLogs(filteredLogs);
    setCurrentPage(1);
  };

  const applyPagination = () => {
    const currentData =
      currentView === "properties"
        ? filteredProperties
        : currentView === "logs"
        ? filteredEmailLogs
        : [];

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginated = currentData.slice(startIndex, endIndex);

    setPaginatedItems(paginated);
    setTotalPages(Math.ceil(currentData.length / ITEMS_PER_PAGE));
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilters({
      state: "all",
      county: "all",
      city: "all",
      zipCode: "all",
      subscriptionStatus: "all",
      campaignWeek: "all",
      replyStatus: "all",
      template: "all",
    });
    setCurrentPage(1);
  };

  const handleExport = async () => {
    const dataToExport: Property[] | EmailLog[] =
      currentView === "properties" ? filteredProperties : filteredEmailLogs;

    if (dataToExport.length === 0) {
      toast({
        title: "No Data",
        description: `No ${currentView} to export`,
        variant: "destructive",
      });
      return;
    }

    try {
      const filename = `${currentView}_${
        new Date().toISOString().split("T")[0]
      }.xlsx`;
      await exportToExcel(dataToExport, filename);

      toast({
        title: "Export Successful",
        description: `Exported ${dataToExport.length} ${currentView} to ${filename}`,
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "Export Failed",
        description: `Failed to export ${currentView}. Please try again.`,
        variant: "destructive",
      });
    }
  };

  const handleRefresh = async () => {
    try {
      await Promise.all([
        refreshProperties(),
        refreshEmailLogs(),
        refreshCampaignProgress(),
        refreshTemplates(),
      ]);

      toast({
        title: "Data Refreshed",
        description: "All dashboard data has been updated",
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

  // Get unique values for filter dropdowns (ensure no nulls)
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
  const uniqueWeeks = [
    ...new Set(emailLogs.map((log) => log.campaign_week)),
  ].sort((a, b) => a - b);

  // Get current template for current week using the rotation formula
  const getCurrentWeekTemplate = () => {
    if (!campaignProgress || !emailTemplates.length) return null;

    const activeTemplates = emailTemplates.filter((t) => t.is_active);
    if (activeTemplates.length === 0) return null;

    // Calculate which template to use based on current week
    // Formula: ((current_week - 1) % total_templates + 1)
    const currentWeek = campaignProgress.current_week;
    const totalTemplates = activeTemplates.length;
    const templateIndex = (currentWeek - 1) % totalTemplates;

    // Sort templates by ID to ensure consistent ordering
    const sortedTemplates = activeTemplates.sort((a, b) => a.id - b.id);

    return sortedTemplates[templateIndex] || null;
  };

  const currentTemplate = getCurrentWeekTemplate();

  useEffect(() => {
    applyFilters();
  }, [searchTerm, filters, properties, emailLogs]);

  useEffect(() => {
    applyPagination();
  }, [filteredProperties, filteredEmailLogs, currentPage, currentView]);

  const loading = propertiesLoading || emailLogsLoading || campaignLoading;

  return (
    <div className="p-6">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Analytics Dashboard
            </h1>
            <p className="mt-2 text-gray-600">
              Comprehensive real estate email campaign analytics and management
            </p>
          </div>
          <div className="flex space-x-4">
            <Button
              onClick={handleRefresh}
              variant="outline"
              disabled={loading}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh All
            </Button>
            <Button
              onClick={handleExport}
              disabled={paginatedItems.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Export {currentView}
            </Button>
          </div>
        </div>

        {/* Campaign Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="mr-2 h-5 w-5" />
              Campaign Status
            </CardTitle>
            <CardDescription>
              Current campaign progress and active template
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-full bg-blue-100">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Current Week
                  </p>
                  <p className="text-2xl font-bold">
                    Week {campaignProgress?.current_week || 1}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-full bg-green-100">
                  <MessageSquare className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Active Template
                  </p>
                  <p className="text-lg font-semibold">
                    {currentTemplate?.template_name || "No active template"}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-full bg-purple-100">
                  <Clock className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Last Sent</p>
                  <p className="text-lg font-semibold">
                    {campaignProgress?.last_sent_at
                      ? new Date(
                          campaignProgress.last_sent_at
                        ).toLocaleDateString()
                      : "Never"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Overview - Dynamic based on filtered data */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">
                    Total Properties
                  </p>
                  <p className="text-2xl font-bold">
                    {calculateFilteredStats().totalProperties.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Mail className="h-8 w-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">
                    Emails Sent
                  </p>
                  <p className="text-2xl font-bold">
                    {calculateFilteredStats().totalEmailsSent.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <MessageSquare className="h-8 w-8 text-purple-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">
                    Total Replies
                  </p>
                  <p className="text-2xl font-bold">
                    {calculateFilteredStats().totalReplies.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-orange-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">
                    Reply Rate
                  </p>
                  <p className="text-2xl font-bold">
                    {calculateFilteredStats().replyRate.toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* View Toggle */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Filter className="mr-2 h-5 w-5" />
                Data Management
              </div>
              <div className="flex space-x-2">
                <Button
                  variant={currentView === "properties" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentView("properties")}
                >
                  Properties ({filteredProperties.length})
                </Button>
                <Button
                  variant={currentView === "logs" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentView("logs")}
                >
                  Email Logs ({filteredEmailLogs.length})
                </Button>
              </div>
            </CardTitle>
            <CardDescription>
              Search and filter data across properties and email campaigns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search properties, names, companies, emails, or templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Location Filters */}
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
              </div>

              {/* Email-specific filters - only show when viewing logs */}
              {currentView === "logs" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label>Campaign Week</Label>
                    <Select
                      value={filters.campaignWeek}
                      onValueChange={(value) =>
                        setFilters({ ...filters, campaignWeek: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All weeks" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All weeks</SelectItem>
                        {uniqueWeeks.map((week) => (
                          <SelectItem key={week} value={week.toString()}>
                            Week {week}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Reply Status</Label>
                    <Select
                      value={filters.replyStatus}
                      onValueChange={(value) =>
                        setFilters({ ...filters, replyStatus: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="replied">Replied</SelectItem>
                        <SelectItem value="not-replied">Not Replied</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Template</Label>
                    <Select
                      value={filters.template}
                      onValueChange={(value) =>
                        setFilters({ ...filters, template: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All templates" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All templates</SelectItem>
                        {emailTemplates.map((template) => (
                          <SelectItem
                            key={template.id}
                            value={template.id.toString()}
                          >
                            {template.template_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="flex space-x-2">
                <Button onClick={clearFilters} variant="outline" size="sm">
                  Clear All Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {currentView === "properties" ? "Properties" : "Email Logs"}(
              {currentView === "properties"
                ? filteredProperties.length
                : filteredEmailLogs.length}
              )
            </CardTitle>
            <CardDescription>
              {(currentView === "properties"
                ? filteredProperties.length
                : filteredEmailLogs.length) !==
                (currentView === "properties"
                  ? properties.length
                  : emailLogs.length) &&
                `Showing ${
                  currentView === "properties"
                    ? filteredProperties.length
                    : filteredEmailLogs.length
                } of ${
                  currentView === "properties"
                    ? properties.length
                    : emailLogs.length
                } ${currentView}`}
              {paginatedItems.length > 0 &&
                totalPages > 1 &&
                ` • Page ${currentPage} of ${totalPages}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <RefreshCw className="h-8 w-8 animate-spin" />
                <p className="text-gray-500">Loading {currentView}...</p>
              </div>
            ) : paginatedItems.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  No {currentView}{" "}
                  {searchTerm || Object.values(filters).some((f) => f !== "all")
                    ? "match your filters"
                    : "found"}
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-md border overflow-x-auto">
                  {currentView === "properties" ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Property Address</TableHead>
                          <TableHead>HOA/Management</TableHead>
                          <TableHead>Decision Maker</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>City</TableHead>
                          <TableHead>State</TableHead>
                          <TableHead>Zip</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(paginatedItems as Property[]).map((property) => (
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
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Property Address</TableHead>
                          <TableHead>Decision Maker</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Template Name</TableHead>
                          <TableHead>Campaign Week</TableHead>
                          <TableHead>Sent At</TableHead>
                          <TableHead>Reply Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(paginatedItems as EmailLog[]).map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-medium max-w-xs truncate">
                              {log.properties?.property_address || "—"}
                            </TableCell>
                            <TableCell>
                              {log.properties?.decision_maker_name || "—"}
                            </TableCell>
                            <TableCell>
                              {log.properties?.decision_maker_email ? (
                                <a
                                  href={`mailto:${log.properties.decision_maker_email}`}
                                  className="text-blue-600 hover:underline truncate block max-w-xs"
                                >
                                  {log.properties.decision_maker_email}
                                </a>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {log.email_templates?.template_name || "—"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                Week {log.campaign_week}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(log.sent_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={log.replied ? "default" : "secondary"}
                              >
                                {log.replied ? "Replied" : "No Reply"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-gray-500">
                      Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
                      {Math.min(
                        currentPage * ITEMS_PER_PAGE,
                        currentView === "properties"
                          ? filteredProperties.length
                          : filteredEmailLogs.length
                      )}{" "}
                      of{" "}
                      {currentView === "properties"
                        ? filteredProperties.length
                        : filteredEmailLogs.length}{" "}
                      results
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
