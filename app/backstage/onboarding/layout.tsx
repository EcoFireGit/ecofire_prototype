// app/profile/layout.tsx
import Layout from "../../layouts/layout";

export default function DashboardSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Layout>{children}</Layout>;
}
