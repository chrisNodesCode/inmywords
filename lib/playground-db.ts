// Playground database client — isolated from lib/prisma.ts (InMyWords).
//
// Uses its own generated client (lib/generated/playground) and its own
// connection string (PLAYGROUND_DATABASE_URL). Kept on a separate global key
// so it can never collide with the InMyWords prisma singleton.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/playground";

const globalForPlayground = globalThis as unknown as {
  playgroundDb: PrismaClient | undefined;
};

function createPlaygroundClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.PLAYGROUND_DATABASE_URL!,
  });
  return new PrismaClient({ adapter });
}

export const playgroundDb =
  globalForPlayground.playgroundDb ?? createPlaygroundClient();

if (process.env.NODE_ENV !== "production") {
  globalForPlayground.playgroundDb = playgroundDb;
}
