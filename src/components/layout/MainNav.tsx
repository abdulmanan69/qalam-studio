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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { useEditorCommands, useEditorStore, type EditLevel } from '@/features/editor/editor-store';
import type { EditorActions } from '@/features/editor/use-editor-actions';
import { useProject, useProjects } from '@/features/projects/hooks';
import { useProjectActions } from '@/features/projects/use-project-actions';
import { setUiLanguage, UI_LANGUAGES } from '@/i18n';
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

/** Menu entry that runs an editor command; disabled when no editor is open. */
function CommandItem({
  label,
  combo,
  onSelect,
}: {
  label: string;
  combo?: string;
  onSelect: (actions: EditorActions) => void;
}) {
  const actions = useEditorCommands((s) => s.actions);
  return (
    <DropdownMenuItem
      disabled={!actions}
      onSelect={() => {
        if (actions) onSelect(actions);
      }}
    >
      {label}
      {combo && <DropdownMenuShortcut>{shortcutText(combo)}</DropdownMenuShortcut>}
    </DropdownMenuItem>
  );
}

/** Open the selected text layer (or the one being edited) at a drill-down level. */
function enterLevel(level: EditLevel) {
  const state = useEditorStore.getState();
  const id = state.editLayerId ?? state.selectedIds.at(-1);
  if (id) state.editLayer(id, level);
}

function LockMarksItem() {
  const { t } = useTranslation();
  const lockMarks = useEditorStore((s) => s.lockMarks);
  const setLockMarks = useEditorStore((s) => s.setLockMarks);
  return (
    <DropdownMenuCheckboxItem checked={lockMarks} onCheckedChange={setLockMarks}>
      {t('letters.lockMarks')}
    </DropdownMenuCheckboxItem>
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
  const { t, i18n } = useTranslation();
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
          <CommandItem
            label={t('file.pageSetup')}
            onSelect={() => {
              useEditorStore.getState().setSetupDialogOpen(true);
            }}
          />
          <CommandItem
            label={t('file.placePhoto')}
            combo={shortcutCombo('placeImage')}
            onSelect={(a) => void a.placeImageFile()}
          />
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
          <CommandItem label={t('edit.undo')} combo={shortcutCombo('undo')} onSelect={(a) => a.undo()} />
          <CommandItem label={t('edit.redo')} combo={shortcutCombo('redo')} onSelect={(a) => a.redo()} />
          <DropdownMenuSeparator />
          <CommandItem label={t('edit.cut')} combo={shortcutCombo('cut')} onSelect={(a) => a.cut()} />
          <CommandItem label={t('edit.copy')} combo={shortcutCombo('copy')} onSelect={(a) => a.copy()} />
          <CommandItem
            label={t('edit.paste')}
            combo={shortcutCombo('paste')}
            onSelect={(a) => void a.paste()}
          />
          <CommandItem
            label={t('edit.duplicate')}
            combo={shortcutCombo('duplicate')}
            onSelect={(a) => a.duplicateSelection()}
          />
          <CommandItem
            label={t('edit.delete')}
            combo={shortcutCombo('deleteLayer')}
            onSelect={(a) => a.deleteSelection()}
          />
          <DropdownMenuSeparator />
          <CommandItem
            label={t('edit.selectAll')}
            combo={shortcutCombo('selectAll')}
            onSelect={(a) => a.selectAll()}
          />
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
          <CommandItem
            label={t('text.textFrame')}
            combo={shortcutCombo('frameTool')}
            onSelect={() => {
              useEditorStore.getState().setTool('frame');
            }}
          />
          <DropdownMenuLabel className="tracking-normal normal-case">{t('text.editHint')}</DropdownMenuLabel>
        </NavMenu>

        <NavMenu label={t('nav.letters')} wide>
          <CommandItem
            label={t('shortcuts.items.editLetters')}
            combo={shortcutCombo('editLetters')}
            onSelect={() => {
              enterLevel('letter');
            }}
          />
          <CommandItem
            label={t('letters.alternates')}
            onSelect={() => {
              enterLevel('letter');
            }}
          />
          <CommandItem
            label={t('letters.kashida')}
            combo={shortcutCombo('kashidaTool')}
            onSelect={() => {
              useEditorStore.getState().setTool('kashida');
            }}
          />
          <CommandItem
            label={t('letters.splitParts')}
            onSelect={() => {
              enterLevel('part');
            }}
          />
          <CommandItem
            label={t('letters.reclassify')}
            onSelect={() => {
              enterLevel('part');
            }}
          />
          <DropdownMenuSeparator />
          <LockMarksItem />
        </NavMenu>

        <NavMenu label={t('nav.layers')} wide>
          <CommandItem
            label={t('layers.bringForward')}
            combo={shortcutCombo('bringForward')}
            onSelect={(a) => a.reorder('forward')}
          />
          <CommandItem
            label={t('layers.sendBackward')}
            combo={shortcutCombo('sendBackward')}
            onSelect={(a) => a.reorder('backward')}
          />
          <CommandItem label={t('layers.group')} combo={shortcutCombo('group')} onSelect={(a) => a.group()} />
          <CommandItem
            label={t('layers.ungroup')}
            combo={shortcutCombo('ungroup')}
            onSelect={(a) => a.ungroup()}
          />
          <CommandItem
            label={t('layers.lock')}
            combo={shortcutCombo('lockLayer')}
            onSelect={(a) => a.toggleLocked(useEditorStore.getState().selectedIds)}
          />
          <CommandItem
            label={t('layers.hide')}
            onSelect={(a) => a.toggleHidden(useEditorStore.getState().selectedIds)}
          />
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
          {(['svg', 'png', 'pdf'] as const).map((format) => (
            <CommandItem
              key={format}
              label={t(`export.${format}`)}
              combo={format === 'png' ? shortcutCombo('exportDesign') : undefined}
              onSelect={() => {
                useEditorStore.getState().setExportDialogOpen(true);
              }}
            />
          ))}
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
              <DropdownMenuRadioGroup value={i18n.language} onValueChange={setUiLanguage}>
                {UI_LANGUAGES.filter((language) => language.available).map((language) => (
                  <DropdownMenuRadioItem key={language.code} value={language.code} lang={language.code}>
                    <span dir={language.dir}>{language.nativeName}</span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
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
