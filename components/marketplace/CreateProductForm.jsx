"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Label } from "@/components/ui/label";

export default function CreateProductForm() {
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: "",
    price: "",
    category: "",
    description: "",
    quantity: "",
    unit: "kg",
    plasticType: "",
    discount: "0"
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate form data
      if (!formData.name || !formData.price || !formData.category || 
          !formData.description || !formData.quantity || 
          !formData.plasticType || !fileInputRef.current.files[0]) {
        throw new Error('Please fill in all required fields and upload an image');
      }

      // Create FormData object for file upload
      const submitData = new FormData();
      
      // Append all form fields
      Object.keys(formData).forEach(key => {
        submitData.append(key, formData[key]);
      });
      
      // Append the image file
      submitData.append('image', fileInputRef.current.files[0]);

      const response = await fetch('/api/products', {
        method: 'POST',
        body: submitData
        // Note: Don't set Content-Type header when sending FormData
        // The browser will set it automatically with the correct boundary
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create product');
      }

      toast({
        title: "Success",
        description: "Product created successfully!",
      });

      router.push('/dashboard?tab=products');
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4">
        <div>
          <Label htmlFor="name">Product Name</Label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
          />
        </div>

        <div>
          <Label htmlFor="price">Price (Rs)</Label>
          <Input
            id="price"
            name="price"
            type="number"
            value={formData.price}
            onChange={handleInputChange}
            required
          />
        </div>

        <div>
          <Label htmlFor="discount">Discount (%)</Label>
          <Input
            id="discount"
            name="discount"
            type="number"
            min="0"
            max="100"
            value={formData.discount}
            onChange={handleInputChange}
          />
        </div>

        <div>
          <Label htmlFor="category">Category</Label>
          <Select 
            name="category" 
            value={formData.category}
            onValueChange={(value) => handleSelectChange('category', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="accessories">Accessories</SelectItem>
              <SelectItem value="home">Home & Living</SelectItem>
              <SelectItem value="furniture">Furniture</SelectItem>
              <SelectItem value="stationery">Stationery</SelectItem>
              <SelectItem value="kitchen">Kitchen</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="plasticType">Plastic Type</Label>
          <Select 
            name="plasticType"
            value={formData.plasticType}
            onValueChange={(value) => handleSelectChange('plasticType', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select plastic type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PET">PET</SelectItem>
              <SelectItem value="HDPE">HDPE</SelectItem>
              <SelectItem value="PVC">PVC</SelectItem>
              <SelectItem value="LDPE">LDPE</SelectItem>
              <SelectItem value="PP">PP</SelectItem>
              <SelectItem value="PS">PS</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="quantity">Quantity</Label>
          <div className="flex gap-3">
            <Input
              id="quantity"
              name="quantity"
              type="number"
              value={formData.quantity}
              onChange={handleInputChange}
              required
              className="flex-1"
            />
            <Select 
              value={formData.unit} 
              onValueChange={(value) => handleSelectChange('unit', value)}
              className="w-1/3"
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kg">Kilograms (kg)</SelectItem>
                <SelectItem value="g">Grams (g)</SelectItem>
                <SelectItem value="pcs">Pieces (pcs)</SelectItem>
                <SelectItem value="ton">Tons</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            required
          />
        </div>

        <div>
          <Label htmlFor="image">Product Image</Label>
          <Input
            id="image"
            name="image"
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageChange}
            required
          />
          {imagePreview && (
            <div className="mt-2">
              <img 
                src={imagePreview} 
                alt="Preview" 
                className="max-h-40 rounded-md"
          />
        </div>
          )}
        </div>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Creating..." : "Create Product"}
      </Button>
    </form>
  );
} 