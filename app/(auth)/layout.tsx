export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--imw-bg-base)",
        gap: "2rem",
        padding: "2rem",
      }}
    >
      <div
        style={{
          fontFamily: "var(--imw-font-display)",
          fontSize: "1.25rem",
          fontWeight: 900,
          letterSpacing: "-0.02em",
          color: "var(--imw-text-primary)",
        }}
      >
        InMyWords
      </div>
      {children}
    </div>
  )
}
