import { Checkbox, FormLayout } from '@shopify/polaris';
import { memo } from 'react';
import { SectionCard } from './SectionCard';

function ContentSectionComponent({ settings, onChange, collapsed, onToggle }) {
  return (
    <SectionCard title="Content" collapsed={collapsed} onToggle={onToggle}>
      <FormLayout>
        <Checkbox
          label="Show Title"
          checked={settings.showTitle}
          onChange={(value) => onChange('showTitle', value)}
        />
        <Checkbox
          label="Show Price"
          checked={settings.showPrice}
          onChange={(value) => onChange('showPrice', value)}
        />
      </FormLayout>
    </SectionCard>
  );
}

export const ContentSection = memo(ContentSectionComponent);
