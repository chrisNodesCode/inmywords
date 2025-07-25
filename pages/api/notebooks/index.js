// pages/api/notebooks/index.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { PrismaClient } from "@prisma/client";

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
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: "Missing title" });
    const newNb = await prisma.notebook.create({
      data: { title, userId },
    });
    return res.status(201).json(newNb);
  }

  res.setHeader("Allow", ["GET", "POST"]);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}