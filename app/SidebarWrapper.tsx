"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export function SidebarWrapper() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  // Chris's Playground is a separate area — no InMyWords sidebar.
  if (pathname.startsWith("/chris")) return null;
  return <Sidebar />;
}
