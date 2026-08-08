import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const onlyAvailable = searchParams.get('available') === '1';

    const products = await prisma.product.findMany({
      where: onlyAvailable ? { isAvailable: true } : undefined,
      include: {
        category: true,
        optionGroups: {
          include: {
            items: true,
          },
        },
        channelPrices: {
          include: {
            channel: { select: { id: true, name: true, gpPercent: true } },
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

    const {
      name,
      description,
      price,
      categoryId,
      imageUrl,
      isAvailable,
      recipes,
      optionGroups,
      channelPrices,
    } = await req.json();

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

    // Save Option Groups & Items (e.g. Sweetness, Milk Type)
    if (optionGroups && Array.isArray(optionGroups)) {
      for (const group of optionGroups) {
        if (!group.name || !Array.isArray(group.items) || group.items.length === 0) continue;
        await prisma.productOptionGroup.create({
          data: {
            productId: product.id,
            name: group.name,
            isRequired: !!group.isRequired,
            minSelect: group.isRequired ? 1 : 0,
            maxSelect: 1,
            items: {
              create: group.items
                .filter((it: any) => it.name)
                .map((it: any) => ({
                  name: it.name,
                  extraPrice: parseFloat(it.extraPrice) || 0,
                })),
            },
          },
        });
      }
    }

    // Save Channel-specific Prices (override of base price per sales channel)
    if (channelPrices && Array.isArray(channelPrices)) {
      const validPrices = channelPrices.filter(
        (cp: any) => cp.channelId && cp.price !== '' && cp.price !== null && !isNaN(parseFloat(cp.price))
      );
      if (validPrices.length > 0) {
        await prisma.productChannelPrice.createMany({
          data: validPrices.map((cp: any) => ({
            productId: product.id,
            channelId: cp.channelId,
            price: parseFloat(cp.price),
          })),
          skipDuplicates: true,
        });
      }
    }

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
        optionGroups: { include: { items: true } },
        channelPrices: { include: { channel: { select: { id: true, name: true, gpPercent: true } } } },
        recipes: { include: { ingredient: true } },
      },
    });

    return NextResponse.json(fullProduct);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
