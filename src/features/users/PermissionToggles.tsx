import { Controller, type Control } from "react-hook-form"

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
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-2 text-sm font-medium">Dashboard</p>
        <LockedRow label="Scoped to managed branches" description="Always on — not configurable." />
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Employees</p>
        <div className="flex flex-col gap-2">
          <Controller
            control={control}
            name="permissions.employees.add"
            render={({ field }) => (
              <ToggleRow label="Add employee" checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
          <Controller
            control={control}
            name="permissions.employees.edit"
            render={({ field }) => (
              <ToggleRow label="Edit employee" checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
          <Controller
            control={control}
            name="permissions.employees.delete"
            render={({ field }) => (
              <ToggleRow label="Delete employee" checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Branches</p>
        <LockedRow label="Section access" description="Admin only — not available to branch admins." />
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Attendance</p>
        <LockedRow label="Scoped to managed branches" description="Always on — not configurable." />
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
            name="permissions.announcements.add"
            render={({ field }) => (
              <ToggleRow label="New announcement" checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
          <Controller
            control={control}
            name="permissions.announcements.edit"
            render={({ field }) => (
              <ToggleRow label="Edit announcement" checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
          <Controller
            control={control}
            name="permissions.announcements.delete"
            render={({ field }) => (
              <ToggleRow label="Delete announcement" checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>
      </div>
    </div>
  )
}
