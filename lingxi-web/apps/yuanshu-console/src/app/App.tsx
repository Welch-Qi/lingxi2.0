import { RouterProvider } from 'react-router';
import { AppProviders } from '@/app/providers/AppProviders';
import { router } from '@/app/router';

/** 应用根组件：Provider 在外，路由在内（保证路由组件可使用全部上下文）。 */
export function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
