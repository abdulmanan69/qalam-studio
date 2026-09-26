import { useTranslation } from 'react-i18next';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { ARTBOARD_PRESETS, isPresetId, type ArtboardPresetGroup } from './artboard-presets';
import type { ArtboardPresetId } from './schema';

const PRESET_GROUPS: readonly ArtboardPresetGroup[] = ['print', 'social', 'screen', 'custom'];

interface PresetSelectProps {
  id?: string;
  value: ArtboardPresetId;
  onValueChange: (value: ArtboardPresetId) => void;
  showSizes?: boolean;
}

/** Artboard preset picker shared by the New Design dialog and the editor properties panel. */
export function PresetSelect({ id, value, onValueChange, showSizes = true }: PresetSelectProps) {
  const { t } = useTranslation();
  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (isPresetId(next)) onValueChange(next);
      }}
    >
      <SelectTrigger id={id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PRESET_GROUPS.map((group) => (
          <SelectGroup key={group}>
            <SelectLabel>{t(`presets.groups.${group}`)}</SelectLabel>
            {ARTBOARD_PRESETS.filter((p) => p.group === group).map((preset) => (
              <SelectItem key={preset.id} value={preset.id}>
                {t(`presets.names.${preset.id}`)}
                {showSizes && preset.id !== 'custom' && (
                  <span className="ms-2 text-muted-foreground" dir="ltr">
                    {preset.width} × {preset.height}
                  </span>
                )}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
