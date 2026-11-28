import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Outlet, Route, Routes } from 'react-router'
import { Toaster } from './components/ui'
import { AdminLayout, AppLayout, AuthLayout, DemoBar, ForbiddenPage, GuestOnly, NotFoundPage, RequireAuth, SuspendedPage } from './layouts'
import { AccountsPage, AdminDashboardPage, AdminSecurityPage, AdminTagsPage, AuditLogPage, ReportsQueuePage, VerificationDetailPage, VerificationQueuePage } from './pages/admin'
import { ForgotPasswordPage, LoginPage, RegisterPage, TwoFactorPage, VerifyPendingPage, VerifySuccessPage } from './pages/auth'
import { ApplyVerificationPage, VerificationStatusPage } from './pages/dv'
import { ArticlesFeedPage, FeedPage, SearchPage, TagsPage } from './pages/feed'
import { NotificationsPage } from './pages/notifications'
import { PostDetailPage, PostFormPage } from './pages/posts'
import { DoctorProfilePage, EditProfilePage, SavedPage, SecurityPage, UserProfilePage } from './pages/profile'
import './styles/index.css'

const Member = () => <RequireAuth memberOnly><Outlet /></RequireAuth>
const Authed = () => <RequireAuth><Outlet /></RequireAuth>

// Route theo bảng URL của Sitemap (mục IV) và Screen Inventory.
function App() {
  return (
    <>
      <Routes>
        {/* Nhóm xác thực: phần duy nhất Guest truy cập được */}
        <Route element={<GuestOnly><AuthLayout /></GuestOnly>}>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email-pending" element={<VerifyPendingPage />} />
          <Route path="/verify-email-success" element={<VerifySuccessPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/login/2fa" element={<TwoFactorPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>
        <Route path="/suspended" element={<SuspendedPage />} />

        <Route element={<AppLayout />}>
          {/* Normal User và Verified Doctor; Admin bị chuyển về cổng quản trị (BR-03) */}
          <Route element={<Member />}>
            <Route path="/" element={<FeedPage />} />
            <Route path="/articles" element={<ArticlesFeedPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/tags" element={<TagsPage />} />
            <Route path="/questions/new" element={<PostFormPage kind="question" mode="create" />} />
            <Route path="/questions/:id/edit" element={<PostFormPage kind="question" mode="edit" />} />
            <Route path="/articles/:id/edit" element={<PostFormPage kind="article" mode="edit" />} />
            <Route path="/profile" element={<UserProfilePage />} />
            <Route path="/profile/edit" element={<EditProfilePage />} />
            <Route path="/profile/saved" element={<SavedPage />} />
            <Route path="/settings/security" element={<SecurityPage />} />
            <Route path="/doctor-verification/apply" element={<ApplyVerificationPage />} />
            <Route path="/doctor-verification/status" element={<VerificationStatusPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
          </Route>
          <Route path="/articles/new" element={<RequireAuth roles={['VERIFIED_DOCTOR']} memberOnly><PostFormPage kind="article" mode="create" /></RequireAuth>} />
          {/* Trang chi tiết: Admin mở được ở chế độ chỉ đọc qua liên kết kiểm duyệt */}
          <Route element={<Authed />}>
            <Route path="/questions/:id" element={<PostDetailPage kind="question" />} />
            <Route path="/articles/:id" element={<PostDetailPage kind="article" />} />
            <Route path="/users/:username" element={<UserProfilePage />} />
            <Route path="/doctor/:username" element={<DoctorProfilePage />} />
            <Route path="/403" element={<ForbiddenPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>

        <Route path="/admin" element={<RequireAuth roles={['ADMIN']}><AdminLayout /></RequireAuth>}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="verifications" element={<VerificationQueuePage />} />
          <Route path="verifications/:id" element={<VerificationDetailPage />} />
          <Route path="reports" element={<ReportsQueuePage />} />
          <Route path="accounts" element={<AccountsPage />} />
          <Route path="tags" element={<AdminTagsPage />} />
          <Route path="audit-logs" element={<AuditLogPage />} />
          <Route path="security" element={<AdminSecurityPage />} />
        </Route>
      </Routes>
      <Toaster />
      <DemoBar />
    </>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
