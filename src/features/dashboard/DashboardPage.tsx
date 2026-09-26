import { useTranslation } from 'react-i18next';

import { PageHeader } from '@/components/layout/PageHeader';
import { useProjects } from '@/features/projects/hooks';
import { useDocumentTitle } from '@/lib/use-document-title';

import { QuickActions } from './QuickActions';
import { RecentProjectsTable } from './RecentProjectsTable';
import { RemindersPanel } from './RemindersPanel';
import { ShortcutLinks } from './ShortcutLinks';
import { WorkspaceOverview } from './WorkspaceOverview';

/**
 * Home dashboard. Three columns on wide screens (reminders · work · status),
 * collapsing to a single column with the primary actions first.
 */
export function DashboardPage() {
  const { t } = useTranslation();
  const projects = useProjects();
  useDocumentTitle(t('dashboard.title'));

  return (
    <>
      <PageHeader title={t('dashboard.title')} />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 p-4 sm:p-6 lg:grid-cols-[15.5rem_minmax(0,1fr)] xl:grid-cols-[15.5rem_minmax(0,1fr)_18rem]">
        <div className="order-2 grid content-start gap-4 lg:order-1">
          <RemindersPanel projects={projects} />
          <ShortcutLinks />
        </div>

        <div className="order-1 grid min-w-0 content-start gap-4 lg:order-2">
          <QuickActions />
          <RecentProjectsTable projects={projects} />
        </div>

        <div className="order-3 grid content-start gap-4 lg:col-span-2 xl:col-span-1">
          <WorkspaceOverview projects={projects} />
        </div>
      </div>
    </>
  );
}
