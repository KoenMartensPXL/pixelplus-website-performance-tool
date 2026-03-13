import { getDb } from "@/app/lib/db";

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function generateUniqueSlug(name: string) {
  const db = await getDb();

  const baseSlug = slugify(name) || "klant";
  let candidate = baseSlug;
  let counter = 2;

  while (true) {
    const [rows] = await db.execute(
      `
        SELECT id
        FROM customers
        WHERE slug = ?
        LIMIT 1
      `,
      [candidate],
    );

    const exists = (rows as any[]).length > 0;

    if (!exists) {
      return candidate;
    }

    candidate = `${baseSlug}-${counter}`;
    counter++;
  }
}
