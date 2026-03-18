import mysql, { Pool } from "mysql2/promise";

declare global {
  // eslint-disable-next-line no-var
  var __mysqlPool: Pool | undefined;
}

function mustEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

export function getDb() {
  if (!global.__mysqlPool) {
    global.__mysqlPool = mysql.createPool({
      uri: mustEnv("DATABASE_URL"),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });
  }

  return global.__mysqlPool;
}
