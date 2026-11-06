Create src/components/ui/PermissionGate.tsx for role-based UI rendering.

This component conditionally renders children based on user permissions.

Export:

1. Component: <PermissionGate permission="create_project">
   - If user has permission: render children
   - If user lacks permission: render fallback (optional)
   - Props:
     * permission: string (from PERMISSIONS constants)
     * fallback?: ReactNode (shows if no permission, default: null)
     * showTooltip?: boolean (shows "You don't have permission" on hover)

2. Component: <RoleGate roles={["Owner", "Admin"]}>
   - If user has one of specified roles: render children
   - Otherwise: render fallback
   - Props:
     * roles: string[]
     * fallback?: ReactNode

3. Hook: useHasPermission(permission)
   - Returns boolean
   - Use in handlers: if (!canDelete) { return showError(...) }

Example usage:
```

<PermissionGate permission={PERMISSIONS.PROJECT.DELETE}> <button onClick={handleDelete}>Delete Project</button> <span slot="fallback">You need Admin access to delete</span> </PermissionGate> ```