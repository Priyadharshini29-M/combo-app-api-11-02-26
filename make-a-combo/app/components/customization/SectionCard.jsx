import { Button, Card } from '@shopify/polaris';

export function SectionCard({ title, collapsed, onToggle, children }) {
  return (
    <Card>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 16, lineHeight: '24px' }}>{title}</h3>
        <Button onClick={onToggle} variant="plain">
          {collapsed ? 'Expand' : 'Collapse'}
        </Button>
      </div>
      {!collapsed ? <div style={{ marginTop: 16 }}>{children}</div> : null}
    </Card>
  );
}
