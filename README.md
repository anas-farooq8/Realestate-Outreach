# Real estate outreach app

_Automatically synced with your [v0.dev](https://v0.dev) deployments_

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/anasfarooq8888-8776s-projects/v0-real-estate-outreach-app)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.dev-black?style=for-the-badge)](https://v0.dev/chat/projects/IqaqQyPAntq)

## Overview

A comprehensive real estate outreach automation platform with AI-powered property data extraction, email campaign management, and analytics. This application features an **invite-only user management system** where only the designated root user can add new users to the platform.

### 🔐 User Management System

- **No Public Signup**: Public registration has been completely removed
- **Root User Access**: Only the root user (defined via `ROOT_USER_EMAIL` environment variable) can invite new users
- **Secure Invitations**: New users receive email invitations with temporary login credentials
- **Automated Onboarding**: Streamlined process for new user account creation and email delivery

For detailed setup instructions for the invite system, see [INVITE_SYSTEM_README.md](./INVITE_SYSTEM_README.md).

## Features

- 📊 **Analytics Dashboard** - Comprehensive email campaign analytics and management
- 🏠 **Property Data Extraction** - AI-powered name extraction from property photos using Gemini AI
- 📧 **Email Template Management** - Create, edit, and manage email templates
- 📋 **Amenity Proposals** - Select and send amenity proposals to property managers
- 👥 **Invite-Only Access** - Secure user management system
- 📈 **Campaign Tracking** - Monitor email delivery, replies, and engagement metrics

## Deployment

Your project is live at:

**[https://vercel.com/anasfarooq8888-8776s-projects/v0-real-estate-outreach-app](https://vercel.com/anasfarooq8888-8776s-projects/v0-real-estate-outreach-app)**

## Build your app

Continue building your app on:

**[https://v0.dev/chat/projects/IqaqQyPAntq](https://v0.dev/chat/projects/IqaqQyPAntq)**

## How It Works

1. Create and modify your project using [v0.dev](https://v0.dev)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository
