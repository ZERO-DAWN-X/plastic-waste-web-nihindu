import { getServerSession } from "next-auth/next";
import { authOptions } from '@/lib/auth-options';
import { NextResponse } from "next/server";
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import prisma from "@/lib/prisma";
import { uploadProductImage } from '@/lib/upload';
import { mkdir } from 'fs/promises';
import path from 'path';

// Points calculation based on plastic type and quantity
function calculateRewardPoints(plasticType, quantity, unit) {
  // Convert quantity to kilograms if needed
  let quantityInKg = parseFloat(quantity);
  
  if (unit === 'g') {
    quantityInKg = quantityInKg / 1000;
  } else if (unit === 'ton') {
    quantityInKg = quantityInKg * 1000;
  } else if (unit === 'pcs') {
    // Approximate weight per piece - adjust as needed
    quantityInKg = quantityInKg * 0.1; // Assuming 100g per piece as default
  }
  
  // Base points per kg
  let pointsPerKg = 5;
  
  // Adjust points based on plastic type
  switch (plasticType.toUpperCase()) {
    case 'PET':
      pointsPerKg = 8;
      break;
    case 'HDPE':
      pointsPerKg = 7;
      break;
    case 'PVC':
      pointsPerKg = 4;
      break;
    case 'LDPE':
      pointsPerKg = 6;
      break;
    case 'PP':
      pointsPerKg = 7;
      break;
    case 'PS':
      pointsPerKg = 5;
      break;
    default:
      pointsPerKg = 5;
  }
  
  // Calculate total points and round to nearest integer
  return Math.round(quantityInKg * pointsPerKg);
}

// Get all products with pagination and sorting
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const db = await getDb();
    
    // Build query
    const query = {};
    if (category && category !== 'all') {
      query.category = category;
    }
    
    // Get products
    const products = await db.collection('Product')
      .aggregate([
        { $match: query },
        {
          $lookup: {
            from: 'User',
            localField: 'sellerId',
            foreignField: '_id',
            as: 'sellerInfo'
          }
        },
        { $unwind: '$sellerInfo' },
        {
          $project: {
            _id: 1,
            name: 1,
            price: 1,
            category: 1,
            description: 1,
            image: 1,
            inStock: 1,
            isNew: 1,
            discount: 1,
            quantity: 1,
            unit: 1,
            plasticType: 1,
            rewardPoints: 1,
            seller: {
              name: '$sellerInfo.name',
              id: '$sellerInfo._id',
              userType: '$sellerInfo.userType'
            }
          }
        }
      ]).toArray();

    // Convert ObjectId to string
    const formattedProducts = products.map(product => ({
      ...product,
      _id: product._id.toString(),
      seller: {
        ...product.seller,
        id: product.seller.id.toString()
      },
      createdAt: product.createdAt ? new Date(product.createdAt).toISOString() : new Date().toISOString()
    }));

    return NextResponse.json({ products: formattedProducts });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

// Create new product
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check authentication and role
    if (!session || !session.user || 
        !(session.user.userType?.toUpperCase() === 'INDIVIDUAL' || 
          session.user.userType?.toUpperCase() === 'COLLECTOR')) {
      return NextResponse.json(
        { error: 'Unauthorized - Only individuals and collectors can create products' }, 
        { status: 403 }
      );
    }

    // Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'products');
    await mkdir(uploadDir, { recursive: true });

    // Handle multipart form data
    const formData = await request.formData();
    const imageFile = formData.get('image');
    
    if (!imageFile) {
      return NextResponse.json(
        { error: 'Missing product image' },
        { status: 400 }
      );
    }

    // Extract other form fields
    const name = formData.get('name');
    const price = formData.get('price');
    const category = formData.get('category');
    const description = formData.get('description');
    const quantity = formData.get('quantity');
    const unit = formData.get('unit') || 'kg';
    const plasticType = formData.get('plasticType');
    const discount = formData.get('discount') || '0';
    
    // Validate required fields
    const requiredFields = [
      { field: 'name', value: name },
      { field: 'price', value: price },
      { field: 'category', value: category },
      { field: 'description', value: description },
      { field: 'quantity', value: quantity },
      { field: 'plasticType', value: plasticType }
    ];
    
    for (const { field, value } of requiredFields) {
      if (!value) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Upload the image and get its path
    const imagePath = await uploadProductImage(imageFile);
    
    // Calculate reward points based on plastic type and quantity
    const rewardPoints = calculateRewardPoints(plasticType, quantity, unit);

    // Create product with proper data structure matching Prisma schema
    const product = await prisma.product.create({
      data: {
        name,
        price: parseFloat(price),
        category,
        description,
        image: imagePath,
        sellerId: session.user.id,
        quantity: parseInt(quantity),
        unit,
        plasticType,
        inStock: true,
        isNew: true,
        discount: parseInt(discount),
        rewardPoints
      }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Product created successfully',
      product
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create product',
        details: error.message
      },
      { status: 500 }
    );
  }
} 