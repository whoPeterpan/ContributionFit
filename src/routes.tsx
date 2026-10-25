import { createBrowserRouter, Navigate } from 'react-router'
import AppShell from './components/AppShell'
import Landing from './pages/Landing'
import Demo from './pages/Demo'
import Discover from './pages/Discover'
import IssueDetail from './pages/IssueDetail'
import Profile from './pages/Profile'
import Saved from './pages/Saved'
import { EmptyState, LinkButton } from './components/ui'

const NotFound = () => <EmptyState icon={<span>404</span>} title="Page not found" body="That page doesn’t exist." action={<LinkButton to="/discover">Back to Discover</LinkButton>} />
const toDemo = <Navigate to="/demo" replace />

export const router = createBrowserRouter([
  { path: '/', Component: Landing },
  { path: 'demo', Component: Demo },
  // Former account routes: there is no authentication in this build.
  ...['login', 'signup', 'auth/callback', 'forgot-password', 'reset-password'].map((path) => ({ path, element: toDemo })),
  {
    Component: AppShell,
    children: [
      { path: 'discover', Component: Discover },
      { path: 'issues/:id', Component: IssueDetail },
      { path: 'saved', Component: Saved },
      { path: 'profile', Component: Profile },
      { path: 'settings/connections', element: <Navigate to="/profile" replace /> },
      { path: '*', Component: NotFound },
    ],
  },
])
