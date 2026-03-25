import { FormLayout, TextField } from '@shopify/polaris';
import { memo } from 'react';
import { SectionCard } from './SectionCard';

function StylingSectionComponent({ settings, onChange, collapsed, onToggle }) {
  return (
    <SectionCard title="Styling" collapsed={collapsed} onToggle={onToggle}>
      <FormLayout>
        <TextField
          label="Primary Color"
          value={settings.primaryColor}
          onChange={(value) => onChange('primaryColor', value)}
          autoComplete="off"
          helpText="Hex color format, for example #000000"
        />
      </FormLayout>
    </SectionCard>
  );
}

export const StylingSection = memo(StylingSectionComponent);
