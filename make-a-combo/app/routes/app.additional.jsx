import { Card, Page, Layout, Avatar, Icon } from "@shopify/polaris";
import { ViewIcon } from "@shopify/polaris-icons";

const layoutFiles = [
  {
    file: "combo_design_one.liquid",
    title: "Combo Design One",
  },
  {
    file: "combo_design_two.liquid",
    title: "Combo Design Two",
  },
  {
    file: "combo_design_three.liquid",
    title: "Combo Design Three",
  },
  {
    file: "combo_design_four.liquid",
    title: "Combo Design Four",
  },
];

function getPreviewUrl(title) {
  return `https://placehold.co/400x200?text=${encodeURIComponent(title)}`;
}

export default function AdditionalDashboard() {
  return (
    <Page
      title="Layouts Preview"
      titleMetadata={<div style={{ width: 40 }}><Icon source={ViewIcon} tone="base" /></div>}
    >
      <Layout>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "1.5rem",
            margin: "0 auto",
            width: "100%",
          }}
        >
          {layoutFiles.map((layout, idx) => (
            <Card
              key={idx}
              title={layout.title}
              sectioned
              onClick={() => alert(`Clicked: ${layout.title}`)}
              style={{ cursor: "pointer" }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <img
                  src={getPreviewUrl(layout.title)}
                  alt={layout.title}
                  style={{ width: "100%", borderRadius: 8, marginBottom: 8 }}
                />
                <div style={{ fontWeight: 600, fontSize: 16 }}>
                  {layout.title}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Layout>
    </Page>
  );
}
