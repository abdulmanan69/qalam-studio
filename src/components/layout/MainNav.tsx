import {
  ChevronDown,
  Clock,
  Download,
  FilePlus2,
  FileUp,
  FolderOpen,
  House,
  Languages,
  LayoutTemplate,
  Trash2,
  Type,
  X,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useMatch, useNavigate } from 'react-router';

import { useUiStore } from '@/app/ui-store';
import { useEditorStore } from '@/features/editor/editor-store';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { useProject, useProjects } from '@/features/projects/hooks';
import { useProjectActions } from '@/features/projects/use-project-actions';
import { UI_LANGUAGES } from '@/i18n';
import { shortcutText } from '@/lib/hotkeys';
import { formatRelativeTime } from '@/lib/time';
import { useNow } from '@/lib/use-now';
import { cn } from '@/lib/utils';

import { HelpMenuItems, ThemeRadioItems } from './menu-items';
import { shortcutCombo } from './shortcuts';

const navItemClass =
  'inline-flex h-full shrink-0 items-center gap-1 px-3 text-[0.8125rem] font-medium text-nav-foreground transition-colors hover:bg-nav-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white data-[state=open]:bg-nav-active';

function NavMenu({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger className={navItemClass}>
        {label}
        <ChevronDown className="size-3 opacity-70" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className={wide ? 'w-72' : 'w-60'}>
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Menu entry for a feature planned in a later release: visible for discoverability, not actionable. */
function PlannedItem({ label, combo }: { label: string; combo?: string }) {
  return (
    <DropdownMenuItem disabled>
      {label}
      {combo && <DropdownMenuShortcut>{combo}</DropdownMenuShortcut>}
    </DropdownMenuItem>
  );
}

function PlannedLabel() {
  const { t } = useTranslation();
  return (
    <DropdownMenuLabel className="tracking-normal normal-case">{t('nav.plannedHint')}</DropdownMenuLabel>
  );
}

function RecentMenu() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const projects = useProjects();
  const now = useNow();
  const recent = (projects ?? []).slice(0, 8);
  return (
    <DropdownMenu modal={false}>
      <SimpleTooltip label={t('nav.recent')}>
        <DropdownMenuTrigger className={cn(navItemClass, 'px-2.5')} aria-label={t('nav.recent')}>
          <Clock className="size-4" aria-hidden />
        </DropdownMenuTrigger>
      </SimpleTooltip>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>{t('nav.recent')}</DropdownMenuLabel>
        {recent.length === 0 && <DropdownMenuItem disabled>{t('dashboard.recent.empty')}</DropdownMenuItem>}
        {recent.map((project) => (
          <DropdownMenuItem
            key={project.id}
            onSelect={() => {
              void navigate(`/editor/${project.id}`);
            }}
          >
            <span className="truncate" dir="auto">
              {project.name}
            </span>
            <DropdownMenuShortcut className="font-sans">
              {formatRelativeTime(project.updatedAt, now)}
            </DropdownMenuShortcut>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function MainNav() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const openDialog = useUiStore((s) => s.openDialog);
  const actions = useProjectActions();
  const editorMatch = useMatch('/editor/:projectId');
  const homeActive = useMatch({ path: '/', end: true }) !== null;
  const currentProject = useProject(editorMatch?.params.projectId);

  return (
    <nav aria-label={t('nav.label')} className="shrink-0 bg-nav text-nav-foreground">
      <div className="flex h-9 [scrollbar-width:none] items-stretch overflow-x-auto px-1 sm:px-2">
        {/* String className (not NavLink's function form): the tooltip's Slot merges classes as strings. */}
        <SimpleTooltip label={t('nav.home')}>
          <Link
            to="/"
            aria-label={t('nav.home')}
            aria-current={homeActive ? 'page' : undefined}
            className={cn(navItemClass, 'px-2.5', homeActive && 'bg-nav-active')}
          >
            <House className="size-4" aria-hidden />
          </Link>
        </SimpleTooltip>
        <RecentMenu />
        <span className="mx-1 my-2 w-px bg-white/20" aria-hidden />

        <NavMenu label={t('nav.file')} wide>
          <DropdownMenuItem
            onSelect={() => {
              openDialog('newDesign');
            }}
          >
            <FilePlus2 aria-hidden />
            {t('quickActions.newDesign')}
            <DropdownMenuShortcut>{shortcutText(shortcutCombo('newDesign'))}</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void actions.openProjectFile()}>
            <FolderOpen aria-hidden />
            {t('quickActions.openProject')}
            <DropdownMenuShortcut>{shortcutText(shortcutCombo('openProject'))}</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void actions.importSvgFile()}>
            <FileUp aria-hidden />
            {t('quickActions.importSvg')}
            <DropdownMenuShortcut>{shortcutText(shortcutCombo('importSvg'))}</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={!currentProject}
            onSelect={() => {
              if (currentProject) actions.downloadProject(currentProject);
            }}
          >
            <Download aria-hidden />
            {t('file.downloadProject')}
            <DropdownMenuShortcut>{shortcutText(shortcutCombo('downloadProject'))}</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!currentProject}
            onSelect={() => {
              void navigate('/');
            }}
          >
            <X aria-hidden />
            {t('file.closeProject')}
          </DropdownMenuItem>
        </NavMenu>

        <NavMenu label={t('nav.edit')}>
          <PlannedItem label={t('edit.undo')} combo={shortcutText('mod+z')} />
          <PlannedItem label={t('edit.redo')} combo={shortcutText('mod+shift+z')} />
          <DropdownMenuSeparator />
          <PlannedItem label={t('edit.cut')} combo={shortcutText('mod+x')} />
          <PlannedItem label={t('edit.copy')} combo={shortcutText('mod+c')} />
          <PlannedItem label={t('edit.paste')} combo={shortcutText('mod+v')} />
          <PlannedItem label={t('edit.duplicate')} combo={shortcutText('mod+d')} />
          <PlannedItem label={t('edit.delete')} combo={shortcutText('delete')} />
          <DropdownMenuSeparator />
          <PlannedItem label={t('edit.selectAll')} combo={shortcutText('mod+a')} />
        </NavMenu>

        <NavMenu label={t('nav.text')} wide>
          <DropdownMenuItem
            disabled={!currentProject}
            onSelect={() => {
              useEditorStore.getState().setTextDialogOpen(true);
            }}
          >
            <Type aria-hidden />
            {t('text.addText')}
            <DropdownMenuShortcut>{shortcutText(shortcutCombo('textTool'))}</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuLabel className="tracking-normal normal-case">{t('text.editHint')}</DropdownMenuLabel>
        </NavMenu>

        <NavMenu label={t('nav.letters')} wide>
          <PlannedLabel />
          <PlannedItem label={t('letters.alternates')} />
          <PlannedItem label={t('letters.kashida')} />
          <PlannedItem label={t('letters.splitParts')} />
          <PlannedItem label={t('letters.reclassify')} />
          <PlannedItem label={t('letters.lockMarks')} />
        </NavMenu>

        <NavMenu label={t('nav.layers')} wide>
          <PlannedLabel />
          <PlannedItem label={t('layers.bringForward')} combo={shortcutText('mod+]')} />
          <PlannedItem label={t('layers.sendBackward')} combo={shortcutText('mod+[')} />
          <PlannedItem label={t('layers.group')} combo={shortcutText('mod+g')} />
          <PlannedItem label={t('layers.ungroup')} combo={shortcutText('mod+shift+g')} />
          <PlannedItem label={t('layers.lock')} />
          <PlannedItem label={t('layers.hide')} />
        </NavMenu>

        <NavMenu label={t('nav.templates')}>
          <DropdownMenuItem
            onSelect={() => {
              void navigate('/templates');
            }}
          >
            <LayoutTemplate aria-hidden />
            {t('templates.browse')}
          </DropdownMenuItem>
        </NavMenu>

        <NavMenu label={t('nav.export')} wide>
          <DropdownMenuItem
            disabled={!currentProject}
            onSelect={() => {
              if (currentProject) actions.downloadProject(currentProject);
            }}
          >
            <Download aria-hidden />
            {t('export.project')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <PlannedLabel />
          <PlannedItem label={t('export.svg')} />
          <PlannedItem label={t('export.png')} />
          <PlannedItem label={t('export.pdf')} />
        </NavMenu>

        <NavMenu label={t('nav.settings')}>
          <DropdownMenuLabel>{t('settings.appearance')}</DropdownMenuLabel>
          <ThemeRadioItems />
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Languages aria-hidden />
              {t('settings.language')}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {UI_LANGUAGES.map((language) => (
                <DropdownMenuItem key={language.code} disabled={!language.available} lang={language.code}>
                  <span dir={language.dir}>{language.nativeName}</span>
                  {!language.available && (
                    <DropdownMenuShortcut className="font-sans">
                      {t('settings.languageSoon')}
                    </DropdownMenuShortcut>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            destructive
            onSelect={() => {
              openDialog('clearData');
            }}
          >
            <Trash2 aria-hidden />
            {t('settings.clearData')}
          </DropdownMenuItem>
        </NavMenu>

        <NavMenu label={t('nav.help')}>
          <HelpMenuItems />
        </NavMenu>
      </div>
    </nav>
  );
}
