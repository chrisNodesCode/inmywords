import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Allow Claude Code Desktop's embedded browser (public origin) to
          // load this localhost server without Chrome's Private Network Access
          // blocking causing ERR_ABORTED.
          { key: "Access-Control-Allow-Private-Network", value: "true" },
        ],
      },
    ];
  },
};

export default nextConfig;
