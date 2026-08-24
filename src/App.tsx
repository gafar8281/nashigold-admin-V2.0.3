import { Navigate, Route, Routes } from "react-router-dom"

import { ProtectedRoute } from "@/routes/ProtectedRoute"
import { PublicOnlyRoute } from "@/routes/PublicOnlyRoute"
import { SectionGate } from "@/routes/SectionGate"
import { LoginPage } from "@/features/auth/LoginPage"
import { DashboardPage } from "@/features/dashboard/DashboardPage"
import { EmployeesPage } from "@/features/employees/EmployeesPage"
import { AttendancePage } from "@/features/attendance/AttendancePage"
import { AnnouncementsPage } from "@/features/announcements/AnnouncementsPage"
import { LeaveRequestsPage } from "@/features/leave-requests/LeaveRequestsPage"
import { ComplaintsPage } from "@/features/complaints/ComplaintsPage"
import { BranchesPage } from "@/features/branches/BranchesPage"
import { UsersPage } from "@/features/users/UsersPage"

function App() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route
          index
          element={
            <SectionGate section="dashboard">
              <DashboardPage />
            </SectionGate>
          }
        />
        <Route
          path="/employees"
          element={
            <SectionGate section="employees">
              <EmployeesPage />
            </SectionGate>
          }
        />
        <Route
          path="/branches"
          element={
            <SectionGate section="branches">
              <BranchesPage />
            </SectionGate>
          }
        />
        <Route
          path="/attendance"
          element={
            <SectionGate section="attendance">
              <AttendancePage />
            </SectionGate>
          }
        />
        <Route
          path="/leave-requests"
          element={
            <SectionGate section="leave-requests">
              <LeaveRequestsPage />
            </SectionGate>
          }
        />
        <Route
          path="/complaints"
          element={
            <SectionGate section="complaints">
              <ComplaintsPage />
            </SectionGate>
          }
        />
        <Route
          path="/announcements"
          element={
            <SectionGate section="announcements">
              <AnnouncementsPage />
            </SectionGate>
          }
        />
        <Route
          path="/users"
          element={
            <SectionGate section="users">
              <UsersPage />
            </SectionGate>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
