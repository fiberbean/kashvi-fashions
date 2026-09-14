import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const department = searchParams.get("department")?.toUpperCase(); // FASHIONS or JEWELLERY
    const categorySlug = searchParams.get("category");
    const featured = searchParams.get("featured");

    const whereClause: any = { inStock: true };

    if (department && (department === "FASHIONS" || department === "JEWELLERY")) {
      whereClause.department = department;
    }

    if (categorySlug) {
      whereClause.category = { slug: categorySlug };
    }

    if (featured === "true") {
      whereClause.isFeatured = true;
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        category: {
          select: { name: true, slug: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, products });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}