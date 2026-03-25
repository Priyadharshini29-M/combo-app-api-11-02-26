import { FormLayout, TextField } from '@shopify/polaris';
import { memo } from 'react';
import { SectionCard } from './SectionCard';

function BehaviorSectionComponent({ collapsed, onToggle }) {
  return (
    <SectionCard title="Behavior" collapsed={collapsed} onToggle={onToggle}>
      <FormLayout>
        <TextField
          label="Preview Sync"
          value="Debounced postMessage at 300ms"
          autoComplete="off"
          readOnly
        />
      </FormLayout>
    </SectionCard>
  );
}

export const BehaviorSection = memo(BehaviorSectionComponent);
