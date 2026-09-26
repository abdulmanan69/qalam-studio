import {
  ArrowDown,
  ArrowUp,
  Copy,
  Download,
  FilePlus2,
  FileUp,
  FolderOpen,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';

import { useUiStore } from '@/app/ui-store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DeleteProjectDialog } from '@/features/projects/DeleteProjectDialog';
import { RenameProjectDialog } from '@/features/projects/RenameProjectDialog';
import type { Project } from '@/features/projects/schema';
import { useProjectActions } from '@/features/projects/use-project-actions';
import { formatDate, formatDateTime, formatRelativeTime } from '@/lib/time';
import { useNow } from '@/lib/use-now';

import { ArtboardSwatch } from './ArtboardSwatch';
import { sortProjects, type SortDir, type SortKey } from './sort-projects';

const COLLAPSED_ROWS = 8;

function SortableHead({
  label,
  column,
  sortKey,
  sortDir,
  onSort,
  className,
}: {
  label: string;
  column: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = sortKey === column;
  const Icon = sortDir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <TableHead
      className={className}
      aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        className="-mx-1 inline-flex items-center gap-1 rounded-sm px-1 hover:text-foreground"
        onClick={() => {
          onSort(column);
        }}
      >
        {label}
        {active && <Icon className="size-3" aria-hidden />}
      </button>
    </TableHead>
  );
}

function EmptyState() {
  const { t } = useTranslation();
  const openDialog = useUiStore((s) => s.openDialog);
  const actions = useProjectActions();
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted">
        <FilePlus2 className="size-6 text-muted-foreground" aria-hidden />
      </span>
      <div>
        <p className="font-medium">{t('dashboard.recent.empty')}</p>
        <p className="text-muted-foreground">{t('dashboard.recent.emptyHint')}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button
          onClick={() => {
            openDialog('newDesign');
          }}
        >
          <FilePlus2 aria-hidden />
          {t('quickActions.newDesign')}
        </Button>
        <Button variant="outline" onClick={() => void actions.importSvgFile()}>
          <FileUp aria-hidden />
          {t('quickActions.importSvg')}
        </Button>
      </div>
    </div>
  );
}

export function RecentProjectsTable({ projects }: { projects: Project[] | undefined }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const actions = useProjectActions();
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expanded, setExpanded] = useState(false);
  const [renaming, setRenaming] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);

  const sorted = useMemo(
    () => (projects ? sortProjects(projects, sortKey, sortDir, i18n.language) : []),
    [projects, sortKey, sortDir, i18n.language],
  );
  const visible = expanded ? sorted : sorted.slice(0, COLLAPSED_ROWS);
  const now = useNow();

  const onSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {t('dashboard.recent.title')}
          {projects && projects.length > 0 && <Badge variant="muted">{projects.length}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {projects === undefined && (
          <p role="status" className="px-4 py-6 text-center text-muted-foreground">
            {t('common.loading')}
          </p>
        )}
        {projects?.length === 0 && <EmptyState />}
        {projects && projects.length > 0 && (
          <Table aria-label={t('dashboard.recent.title')}>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <SortableHead
                  label={t('dashboard.recent.name')}
                  column="name"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                  className="ps-4"
                />
                <TableHead className="hidden md:table-cell">{t('dashboard.recent.artboard')}</TableHead>
                <SortableHead
                  label={t('dashboard.recent.modified')}
                  column="updatedAt"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                />
                <SortableHead
                  label={t('dashboard.recent.created')}
                  column="createdAt"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                  className="hidden lg:table-cell"
                />
                <TableHead className="w-10 pe-4">
                  <span className="sr-only">{t('dashboard.recent.actions')}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((project) => {
                const artboard = project.artboards[0];
                return (
                  <TableRow key={project.id}>
                    <TableCell className="ps-4">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <ArtboardSwatch artboard={artboard} />
                        <Link
                          to={`/editor/${project.id}`}
                          className="truncate font-medium text-link hover:underline"
                          dir="auto"
                        >
                          {project.name}
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {artboard && (
                        <>
                          {t(`presets.names.${artboard.presetId}`)}{' '}
                          <span dir="ltr">
                            ({artboard.width} × {artboard.height})
                          </span>
                        </>
                      )}
                    </TableCell>
                    <TableCell>
                      <time
                        dateTime={new Date(project.updatedAt).toISOString()}
                        title={formatDateTime(project.updatedAt, i18n.language)}
                      >
                        {formatRelativeTime(project.updatedAt, now, i18n.language)}
                      </time>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">
                      <time dateTime={new Date(project.createdAt).toISOString()}>
                        {formatDate(project.createdAt, i18n.language)}
                      </time>
                    </TableCell>
                    <TableCell className="pe-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={t('dashboard.recent.actionsFor', { name: project.name })}
                          >
                            <MoreHorizontal aria-hidden />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onSelect={() => {
                              void navigate(`/editor/${project.id}`);
                            }}
                          >
                            <FolderOpen aria-hidden />
                            {t('common.open')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => {
                              setRenaming(project);
                            }}
                          >
                            <Pencil aria-hidden />
                            {t('common.rename')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => void actions.duplicate(project)}>
                            <Copy aria-hidden />
                            {t('common.duplicate')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => {
                              actions.downloadProject(project);
                            }}
                          >
                            <Download aria-hidden />
                            {t('file.downloadProject')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            destructive
                            onSelect={() => {
                              setDeleting(project);
                            }}
                          >
                            <Trash2 aria-hidden />
                            {t('common.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
      {sorted.length > COLLAPSED_ROWS && (
        <CardFooter className="justify-center">
          <Button
            variant="link"
            onClick={() => {
              setExpanded((e) => !e);
            }}
          >
            {expanded
              ? t('dashboard.recent.showLess')
              : t('dashboard.recent.showAll', { count: sorted.length })}
          </Button>
        </CardFooter>
      )}

      <RenameProjectDialog
        project={renaming}
        onRename={actions.rename}
        onOpenChange={(open) => {
          if (!open) setRenaming(null);
        }}
      />
      <DeleteProjectDialog
        project={deleting}
        onConfirm={(project) => void actions.remove(project)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      />
    </Card>
  );
}
