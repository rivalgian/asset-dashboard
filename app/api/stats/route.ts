import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [summary, models, processors, brands] =
  await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(DISTINCT product_model)::int AS models,
          COUNT(DISTINCT processor)::int AS processors,
          COUNT(DISTINCT split_part(product_model, ' ', 1))::int AS brands
        FROM assets
      `),
      pool.query(`
        SELECT product_model AS name, COUNT(*)::int AS value
        FROM assets
        GROUP BY product_model
        ORDER BY value DESC, name ASC
        LIMIT 12
      `),
      pool.query(`
        SELECT processor AS name, COUNT(*)::int AS value
        FROM assets
        GROUP BY processor
        ORDER BY value DESC, name ASC
        LIMIT 12
      `),
      pool.query(`
        SELECT
        split_part(product_model, ' ', 1) AS name,
        COUNT(*)::int AS value
        FROM assets
        GROUP BY split_part(product_model, ' ', 1)
        ORDER BY value DESC
      `)
    ]);

    return NextResponse.json({
      summary: summary.rows[0],
      models: models.rows,
      processors: processors.rows,
      brands: brands.rows
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Gagal mengambil statistik." },
      { status: 500 }
    );
  }
}
