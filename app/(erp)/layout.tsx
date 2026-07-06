import { ErpShell } from "@/components/erp-shell";

export default function ErpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ErpShell>{children}</ErpShell>;
}