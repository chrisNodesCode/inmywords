"use client";

import { PricingTable } from "@clerk/nextjs";

const devBypass = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true";

export default function SelectPlanPage() {
  if (devBypass) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--imw-font-ui)",
          color: "var(--imw-text-secondary)",
        }}
      >
        Dev bypass active — plan selection skipped.
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--imw-bg-base)",
        padding: "3rem 2rem",
        gap: "2rem",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontFamily: "var(--imw-font-display)",
            fontSize: "1.7rem",
            fontWeight: 900,
            letterSpacing: "-0.02em",
            color: "var(--imw-text-primary)",
            marginBottom: "0.5rem",
          }}
        >
          Choose your plan
        </div>
        <p
          style={{
            fontFamily: "var(--imw-font-ui)",
            fontSize: "0.9rem",
            color: "var(--imw-text-secondary)",
            margin: 0,
          }}
        >
          Start documenting your lived experience with AI support.
        </p>
      </div>
      <PricingTable />
    </div>
  );
}
