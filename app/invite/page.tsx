"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  UserPlus,
  Mail,
  Shield,
  Trash2,
  RefreshCw,
  Users,
  Clock,
  CheckCircle,
} from "lucide-react";
import { useInviteController } from "@/hooks/use-invite-controller";

export default function InviteUserPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const {
    invites,
    isLoading,
    error,
    isSubmitting,
    isAuthorized,
    inviteUser,
    deleteUser,
    refreshInvites,
    stats,
    formatDate,
  } = useInviteController();

  async function handleInviteUser(e: React.FormEvent) {
    e.preventDefault();

    if (!email.trim()) {
      return;
    }

    const success = await inviteUser({
      email: email.trim(),
      message: message.trim() || undefined,
    });

    if (success) {
      setEmail("");
      setMessage("");
    }
  }

  async function handleDeleteUser(userId: string, email: string) {
    await deleteUser(userId, email);
  }

  function getStatusBadge(invite: any) {
    // Simply show if the user has an account
    if (invite.user_id) {
      return (
        <Badge variant="secondary" className="gap-1">
          <CheckCircle className="h-3 w-3" />
          Account Created
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="gap-1">
        <Clock className="h-3 w-3" />
        Invite Sent
      </Badge>
    );
  }

  if (isAuthorized === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200"></div>
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600 absolute top-0"></div>
          </div>
          <div className="text-center">
            <p className="text-lg font-medium text-gray-700">
              Checking Authorization
            </p>
            <p className="text-sm text-gray-500">
              Verifying your admin privileges...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isAuthorized === false) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-lg shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 bg-red-100 rounded-full flex items-center justify-center">
              <Shield className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-red-700 mb-2">
              Access Denied
            </CardTitle>
            <CardDescription className="text-red-600">
              You don't have permission to access this page.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center p-8">
            <p className="text-gray-600 mb-6">
              Only system administrators can invite new users to the platform.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              User Invitations
            </h1>
            <p className="mt-2 text-gray-600">
              Send invitations and manage user access to the platform
            </p>
          </div>
          <div className="flex space-x-4">
            <Button
              onClick={refreshInvites}
              variant="outline"
              disabled={isLoading}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.total}
                  </p>
                  <p className="text-sm text-gray-600">Total Invites</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <UserPlus className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.usersWithAccounts}
                  </p>
                  <p className="text-sm text-gray-600">Users with Accounts</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="invite" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="invite">Send Invite</TabsTrigger>
            <TabsTrigger value="manage">Manage Invites</TabsTrigger>
          </TabsList>

          {/* Send Invite Tab */}
          <TabsContent value="invite">
            <Card className="shadow-lg">
              <CardContent className="p-6">
                <Alert className="mb-6">
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    Only administrators can invite new users. The invited user
                    will receive login credentials via email.
                  </AlertDescription>
                </Alert>

                <form onSubmit={handleInviteUser} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email Address *
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="user@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message" className="text-sm font-medium">
                      Welcome Message (Optional)
                    </Label>
                    <Textarea
                      id="message"
                      placeholder="Add a personal welcome message for the new user..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="min-h-[100px] resize-none"
                      disabled={isSubmitting}
                    />
                    <p className="text-xs text-gray-500">
                      This message will be included in the invitation email.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                        Sending Invitation...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Send Invitation
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Manage Invites Tab */}
          <TabsContent value="manage">
            <Card className="shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Manage Invitations</CardTitle>
                  <CardDescription>
                    View and manage all sent invitations
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshInvites}
                  disabled={isLoading}
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${
                      isLoading ? "animate-spin" : ""
                    }`}
                  />
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : error ? (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : invites.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600">No invitations sent yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Invited Date</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invites.map((invite) => (
                        <TableRow key={invite.id}>
                          <TableCell className="font-medium">
                            {invite.email}
                          </TableCell>
                          <TableCell>{getStatusBadge(invite)}</TableCell>
                          <TableCell>{formatDate(invite.created_at)}</TableCell>
                          <TableCell>
                            {invite.user_last_sign_in_at ? (
                              <div className="text-sm">
                                {formatDate(invite.user_last_sign_in_at)}
                              </div>
                            ) : invite.user_id ? (
                              <span className="text-gray-400 italic text-sm">
                                Never logged in
                              </span>
                            ) : (
                              <span className="text-gray-400 italic text-sm">
                                No account yet
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {invite.user_id && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className="gap-2"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Delete User
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Delete User Account
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete the user
                                      account for{" "}
                                      <strong>{invite.email}</strong>? This
                                      action cannot be undone. The user will
                                      lose access immediately and all their data
                                      will be removed.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() =>
                                        handleDeleteUser(
                                          invite.user_id!,
                                          invite.email
                                        )
                                      }
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete User
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
