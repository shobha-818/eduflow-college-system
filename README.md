# EduFlow – AI-Powered College Workflow Management System

EduFlow is a comprehensive, full-stack college management platform designed to streamline academic and administrative workflows. It provides role-based dashboards for Students, Faculty, HODs, and Administrators, automating attendance tracking, leave approvals, task management, event coordination, and document workflows.

## 🚀 Live Demo
**[https://eduflow-college-system.vercel.app](https://eduflow-college-system.vercel.app)**

## ✨ Key Features
* **Role-Based Access Control (RBAC):** Secure dashboards tailored for Students, Faculty, HODs, and Admin users.
* **Attendance Management:** Real-time tracking, reporting, and analytics.
* **Leave & Approval Workflow:** Multi-level digital application and approval process.
* **Task & Notice Management:** Assign, track, and manage academic tasks and institutional notices.
* **Event & Meeting Coordination:** Schedule and manage college events and department meetings.
* **Document Management:** Secure storage and retrieval of academic documents.
* **Real-time Notifications:** Instant alerts for approvals, announcements, and system updates.
* **Email System:** Automated email verification and notifications using Nodemailer.

## 🛠️ Tech Stack
**Frontend:**
* Next.js 14+ (App Router)
* React.js
* Tailwind CSS
* Shadcn UI (Component Library)
* TypeScript

**Backend & Database:**
* Supabase (PostgreSQL)
* Supabase Authentication (Auth)
* Supabase Row Level Security (RLS)

**Deployment & Integrations:**
* Vercel (Hosting & CI/CD)
* GitHub (Version Control)
* Nodemailer (Email Services)

## 🏗️ Architecture & Security
* **Frontend:** Server-side rendered (SSR) pages and API routes handled by Next.js for optimal performance.
* **Database:** Hosted on Supabase (PostgreSQL). The database includes highly complex **Row Level Security (RLS)** policies to ensure that students can only view their own data, faculty can view their assigned classes, and admins have full control.
* **API:** Next.js API routes (`/app/api/...`) handle secure server-side operations like sending emails and processing complex data mutations.

## ⚙️ Local Development Setup

If you want to run this project locally, follow these steps:

### 1. Clone the repository
```bash
git clone https://github.com/shobha-818/eduflow-college-system.git
cd eduflow-college-system
