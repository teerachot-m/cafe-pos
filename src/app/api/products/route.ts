import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: true,
        optionGroups: {
          include: {
            items: true,
          },
        },
        recipes: {
          include: {
            ingredient: true,
            optionItem: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(products);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { name, description, price, categoryId, imageUrl, isAvailable, recipes } = await req.json();

    if (!name || !price || !categoryId) {
      return NextResponse.json({ error: 'Name, price, and category are required' }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        categoryId,
        imageUrl: imageUrl || null,
        isAvailable: isAvailable !== undefined ? isAvailable : true,
      },
    });

    // Save BOM Recipes if provided
    if (recipes && Array.isArray(recipes) && recipes.length > 0) {
      await prisma.recipeBOM.createMany({
        data: recipes.map((r: any) => ({
          productId: product.id,
          ingredientId: r.ingredientId,
          optionItemId: r.optionItemId || null,
          quantityRequired: parseFloat(r.quantityRequired),
        })),
      });
    }

    const fullProduct = await prisma.product.findUnique({
      where: { id: product.id },
      include: {
        category: true,
        recipes: { include: { ingredient: true } },
      },
    });

    return NextResponse.json(fullProduct);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
