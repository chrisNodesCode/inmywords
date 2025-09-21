// pages/api/notebooks/index.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { PrismaClient } from "@prisma/client";
import { DEFAULT_ENTRY_STATUS, ENTRY_STATUS_VALUES } from "@/constants/entryStatus";

const prisma = new PrismaClient();

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const userId = session.user.id;
  if (req.method === "GET") {
    const notebooks = await prisma.notebook.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json(notebooks);
  }

  if (req.method === "POST") {
    const { title, description, user_notebook_tree, precursorId } = req.body || {};
    if (!title) return res.status(400).json({ error: "Missing title" });

    if (precursorId) {
      try {
        const precursor = await prisma.precursor.findUnique({ where: { id: precursorId } });
        if (!precursor) {
          return res.status(404).json({ error: "Precursor not found" });
        }

        const tree = [
          precursor.pattern?.group || "Group",
          precursor.pattern?.subgroup || "Subgroup",
          precursor.pattern?.entry || "Entry",
        ];

        const newNb = await prisma.$transaction(async (tx) => {
          const nb = await tx.notebook.create({
            data: {
              title,
              description,
              userId,
              user_notebook_tree: tree,
              precursorId,
            },
          });

          for (const g of precursor.modelData || []) {
            const group = await tx.group.create({
              data: {
                name: g.title || g.id || "Group",
                notebookId: nb.id,
              },
            });
            if (Array.isArray(g.subcriteria)) {
              for (const sg of g.subcriteria) {
                const subgroup = await tx.subgroup.create({
                  data: {
                    name: sg.title || sg.id || "Subgroup",
                    groupId: group.id,
                  },
                });
                if (Array.isArray(sg.entries)) {
                  for (const e of sg.entries) {
                    const entryStatus =
                      typeof e.status === 'string' && ENTRY_STATUS_VALUES.includes(e.status)
                        ? e.status
                        : DEFAULT_ENTRY_STATUS;
                    await tx.entry.create({
                      data: {
                        title: e.title || e.id || "Entry",
                        content: e.content || "",
                        userId,
                        subgroupId: subgroup.id,
                        status: entryStatus,
                      },
                    });
                  }
                }
              }
            }
          }

          return nb;
        });

        return res.status(201).json(newNb);
      } catch (error) {
        console.error("POST /api/notebooks error", error);
        return res
          .status(500)
          .json({ error: "Failed to create notebook from precursor" });
      }
    }

    const newNb = await prisma.notebook.create({
      data: {
        title,
        description,
        userId,
        ...(user_notebook_tree ? { user_notebook_tree } : {}),
      },
    });
    return res.status(201).json(newNb);
  }

  res.setHeader("Allow", ["GET", "POST"]);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
