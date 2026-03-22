"use client";

import { UserProfile } from "@clerk/nextjs";

const devBypass = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true";

export default function ProfilePage() {
  if (devBypass) {
    return (
      <div
        style={{
          minHeight: "100vh",
          padding: "40px 24px",
          backgroundColor: "var(--imw-bg-base)",
        }}
      >
        <p className="imw-body" style={{ color: "var(--imw-text-secondary)" }}>
          Profile management is unavailable in dev mode.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "40px 24px",
        backgroundColor: "var(--imw-bg-base)",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <UserProfile
        appearance={{
          variables: {
            colorBackground: "var(--imw-bg-surface)",
            colorInputBackground: "var(--imw-bg-base)",
            colorText: "var(--imw-text-primary)",
            colorTextSecondary: "var(--imw-text-secondary)",
            colorPrimary: "var(--imw-ac)",
            colorDanger: "var(--imw-text-destructive)",
            borderRadius: "8px",
          },
        }}
      />
    </div>
  );
}
