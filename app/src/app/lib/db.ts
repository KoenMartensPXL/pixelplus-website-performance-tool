import mysql from "mysql2/promise";

let connection: mysql.Connection | null = null;

export async function getDb() {
  if (connection) return connection;

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("Missing DATABASE_URL");
  }

  connection = await mysql.createConnection({
    uri: databaseUrl,
  });

  return connection;
}
