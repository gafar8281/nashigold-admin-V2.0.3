import { Controller, useWatch, type Control } from "react-hook-form"

import type { UserFormInput } from "@/features/users/user-schema"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import { Switch } from "@/components/ui/switch"

function ToggleRow({
  label,
  checked,
  onCheckedChange,
  disabled,
  description,
}: {
  label: string
  checked: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  description?: string
}) {
  return (
    <FieldLabel className="items-center">
      <Field orientation="horizontal">
        <FieldContent>
          <FieldTitle>{label}</FieldTitle>
          {description && <FieldDescription>{description}</FieldDescription>}
        </FieldContent>
        <Switch
          size="sm"
          checked={checked}
          onCheckedChange={disabled ? undefined : onCheckedChange}
          disabled={disabled}
        />
      </Field>
    </FieldLabel>
  )
}

/** Module sections whose rules are fixed, not configurable — see
 * src/lib/permissions.ts `normalizePermissions`. Rendered locked so the
 * policy is visible rather than mysterious. */
function LockedRow({ label, description }: { label: string; description: string }) {
  return <ToggleRow label={label} checked={false} disabled description={description} />
}

export function PermissionToggles({ control }: { control: Control<UserFormInput> }) {
  const employeesEnabled = useWatch({ control, name: "permissions.employees.enabled" })
  const inventoryEnabled = useWatch({ control, name: "permissions.inventory.enabled" })
  const announcementsEnabled = useWatch({ control, name: "permissions.announcements.enabled" })

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-2 text-sm font-medium">Dashboard</p>
        <Controller
          control={control}
          name="permissions.dashboard.enabled"
          render={({ field }) => (
            <ToggleRow
              label="Section access"
              checked={field.value}
              onCheckedChange={field.onChange}
              description="Read-only, scoped to managed branches."
            />
          )}
        />
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Employees</p>
        <div className="flex flex-col gap-2">
          <Controller
            control={control}
            name="permissions.employees.enabled"
            render={({ field }) => (
              <ToggleRow
                label="Section access"
                checked={field.value}
                onCheckedChange={field.onChange}
                description="View the employee roster for managed branches."
              />
            )}
          />
          <Controller
            control={control}
            name="permissions.employees.add"
            render={({ field }) => (
              <ToggleRow
                label="Add employee"
                checked={employeesEnabled && field.value}
                onCheckedChange={field.onChange}
                disabled={!employeesEnabled}
              />
            )}
          />
          <Controller
            control={control}
            name="permissions.employees.edit"
            render={({ field }) => (
              <ToggleRow
                label="Edit employee"
                checked={employeesEnabled && field.value}
                onCheckedChange={field.onChange}
                disabled={!employeesEnabled}
              />
            )}
          />
          <Controller
            control={control}
            name="permissions.employees.delete"
            render={({ field }) => (
              <ToggleRow
                label="Delete employee"
                checked={employeesEnabled && field.value}
                onCheckedChange={field.onChange}
                disabled={!employeesEnabled}
              />
            )}
          />
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Branches</p>
        <LockedRow label="Section access" description="Admin only — not available to branch admins." />
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Inventory</p>
        <div className="flex flex-col gap-2">
          <Controller
            control={control}
            name="permissions.inventory.enabled"
            render={({ field }) => (
              <ToggleRow
                label="Section access"
                checked={field.value}
                onCheckedChange={field.onChange}
                description="View inventory for all branches."
              />
            )}
          />
          <Controller
            control={control}
            name="permissions.inventory.upload"
            render={({ field }) => (
              <ToggleRow
                label="Upload inventory"
                checked={inventoryEnabled && field.value}
                onCheckedChange={field.onChange}
                disabled={!inventoryEnabled}
                description="Replaces the entire inventory for all branches."
              />
            )}
          />
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Attendance</p>
        <Controller
          control={control}
          name="permissions.attendance.enabled"
          render={({ field }) => (
            <ToggleRow
              label="Section access"
              checked={field.value}
              onCheckedChange={field.onChange}
              description="Read-only, scoped to managed branches."
            />
          )}
        />
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Leave Requests</p>
        <Controller
          control={control}
          name="permissions.leaveRequests.enabled"
          render={({ field }) => (
            <ToggleRow
              label="Section access"
              checked={field.value}
              onCheckedChange={field.onChange}
              description="When enabled, scoped to managed branches."
            />
          )}
        />
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Complaints</p>
        <LockedRow label="Section access" description="Admin only — not available to branch admins." />
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Announcements</p>
        <div className="flex flex-col gap-2">
          <Controller
            control={control}
            name="permissions.announcements.enabled"
            render={({ field }) => (
              <ToggleRow
                label="Section access"
                checked={field.value}
                onCheckedChange={field.onChange}
                description="View announcements."
              />
            )}
          />
          <Controller
            control={control}
            name="permissions.announcements.add"
            render={({ field }) => (
              <ToggleRow
                label="New announcement"
                checked={announcementsEnabled && field.value}
                onCheckedChange={field.onChange}
                disabled={!announcementsEnabled}
              />
            )}
          />
          <Controller
            control={control}
            name="permissions.announcements.edit"
            render={({ field }) => (
              <ToggleRow
                label="Edit announcement"
                checked={announcementsEnabled && field.value}
                onCheckedChange={field.onChange}
                disabled={!announcementsEnabled}
              />
            )}
          />
          <Controller
            control={control}
            name="permissions.announcements.delete"
            render={({ field }) => (
              <ToggleRow
                label="Delete announcement"
                checked={announcementsEnabled && field.value}
                onCheckedChange={field.onChange}
                disabled={!announcementsEnabled}
              />
            )}
          />
        </div>
      </div>
    </div>
  )
}
