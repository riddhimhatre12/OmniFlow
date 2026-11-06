# OMNI-Flow

Enterprise Multi-Workspace SaaS Platform combining Project Management, Team Collaboration, Role-Based Access Control (RBAC), and Real-Time Workspaces.

## Tech Stack
- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Enterprise Design System Tokens (`index.css`)
- **Backend & Database**: Convex (Real-time Cloud Backend)
- **Auth**: JWT Authentication & Google OAuth
- **Icons**: Lucide React
- **Linter**: Oxlint

## Key Capabilities
- **Multi-Workspace Engine**: Seamless workspace creation, switching, and scoped data isolation.
- **Granular RBAC**: Default system roles (Owner, Admin, Manager, Member, Viewer) plus custom role builder.
- **Permission Gate UI**: Declarative `<PermissionGate>` and `<RoleGate>` components with disabled hover tooltips.
- **Team & Invitations**: Member management, email invitations with 24-hour expiring tokens, role transitions.
- **Live Metrics & Activities**: Real-time KPI cards and workspace audit event feeds.
- **Workspace Roles Console**: Custom permissions matrix across Workspace, Project, and Task scopes.

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Create a `.env.local` file:
```env
VITE_CONVEX_URL=https://shocking-opossum-923.eu-west-1.convex.cloud
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

### 3. Run Development Server
```bash
npm run dev
```

### 4. Build for Production
```bash
npm run build
```
