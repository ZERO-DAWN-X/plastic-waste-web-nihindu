import { writeFile } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Handles file upload for product images
 * @param {File} file - The file to upload
 * @returns {Promise<string>} - The path to the uploaded file
 */
export async function uploadProductImage(file) {
  try {
    // Get the file data
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create a unique filename
    const originalFilename = file.name;
    const extension = path.extname(originalFilename);
    const filename = `${uuidv4()}${extension}`;
    
    // Define the upload path - make sure this directory exists
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'products');
    const filePath = path.join(uploadDir, filename);
    
    // Write the file to disk
    await writeFile(filePath, buffer);
    
    // Return the path that will be stored in the database
    return `/uploads/products/${filename}`;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error('Failed to upload file');
  }
} 