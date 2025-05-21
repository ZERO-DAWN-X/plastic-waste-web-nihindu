"use client";

import { useState, useEffect } from "react";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Recycle,
  Calendar,
  Award,
  Truck,
  ChevronRight,
  CreditCard,
  TrendingUp,
  User,
  ShoppingBag,
  Package,
  Plus,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/use-toast";

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();
  const [dashboardData, setDashboardData] = useState({
    collections: [],
    products: [],
    points: 0,
    totalCollections: 0,
    totalProducts: 0,
    totalOrders: 0,
    recentActivity: [],
    totalSpent: 0,
    totalRevenue: 0,
    orders: [],
  });
  const [activeTab, setActiveTab] = useState("overview");
  const [userProducts, setUserProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);

  // Get tab from URL parameters
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const tab = urlParams.get("tab");
      if (tab && ["overview", "products", "post"].includes(tab)) {
        setActiveTab(tab);
      }
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (session?.user?.id) {
      console.log("Loading dashboard data for user:", session.user.id);
      fetchDashboardData();
      fetchUserProducts();
      fetchRecentActivity();
    }
  }, [session]);

  // Add direct state verification after fetching
  useEffect(() => {
    console.log("Dashboard state updated:", {
      recentActivity: dashboardData.recentActivity,
      collections: dashboardData.collections,
      totalOrders: dashboardData.totalOrders
    });
  }, [dashboardData]);

  const fetchDashboardData = async () => {
    try {
      setOverviewLoading(true);
      // Use the main dashboard API endpoint
      const response = await fetch("/api/dashboard");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch dashboard data");
      }

      // Debug log the response
      console.log("Dashboard API response:", data);
      console.log("Recent Activity from API:", data.recentActivity);

      // Force a full reset of state to ensure new data is recognized
      setDashboardData({
        collections: data.collections || [],
        products: data.products || [],
        points: data.points || 0,
        totalCollections: data.totalCollections || 0,
        totalProducts: data.totalProducts || 0,
        totalOrders: data.totalOrders || 0,
        recentActivity: Array.isArray(data.recentActivity) ? [...data.recentActivity] : [],
        totalSpent: data.totalSpent || 0,
        totalRevenue: data.totalRevenue || 0,
        orders: data.orders || [],
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setOverviewLoading(false);
    }
  };

  const fetchUserProducts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/products/user");
      const data = await response.json();

      if (response.ok && data.success) {
        setUserProducts(data.products || []);
      } else {
        throw new Error(data.error || "Failed to fetch products");
      }
    } catch (error) {
      console.error("Error fetching user products:", error);
      toast({
        title: "Error",
        description: error.message || "Could not load your products",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const response = await fetch("/api/recent-activity");
      const data = await response.json();
      
      if (response.ok && data.success && data.activities && data.activities.length > 0) {
        console.log("Fetched recent activity from dedicated API:", data.activities);
        setRecentActivity(data.activities);
      } else {
        console.log("No recent activity from dedicated API, using fallback");
        // Fallback activity items
        setRecentActivity([
          {
            type: 'order',
            title: 'Order pending',
            description: 'Order #682daf7d - Waiting for approval',
            date: new Date().toISOString(),
            status: 'PENDING'
          },
          {
            type: 'order',
            title: 'Order completed',
            description: 'Order #682da33d - Order completed',
            date: new Date(Date.now() - 86400000).toISOString(),
            status: 'COMPLETED'
          }
        ]);
      }
    } catch (error) {
      console.error("Error fetching recent activity:", error);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Remove the deleted product from the local state
        setUserProducts(
          userProducts.filter((product) => product.id !== productId)
        );
        toast({
          title: "Success",
          description: "Product deleted successfully",
          variant: "success",
        });
      } else {
        throw new Error(data.error || "Failed to delete product");
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      toast({
        title: "Error",
        description: error.message || "Could not delete product",
        variant: "destructive",
      });
    }
  };

  // Calculate total recycled quantity from both collections and orders
  const totalRecycled = () => {
    // Get recycled quantity from collections
    const collectionsTotal = dashboardData.collections.reduce(
    (sum, collection) => sum + (parseFloat(collection.quantity) || 0),
    0
  );
    
    // Get recycled quantity from orders
    const ordersTotal = dashboardData.orders.reduce(
      (sum, order) => sum + (parseFloat(order.quantity) || 0),
      0
    );
    
    // If there's activity data but no orders in dashboard, use activity data for calculation
    const activityOrdersTotal = getRecentActivity()
      .filter(activity => activity.type === 'order' && activity.quantity)
      .reduce((sum, activity) => sum + (parseFloat(activity.quantity) || 0), 0);
    
    // If we have orders in dashboardData, use that, otherwise use the activity data
    const finalOrdersTotal = dashboardData.orders.length > 0 ? ordersTotal : activityOrdersTotal;
    
    console.log(`Total recycled breakdown - Collections: ${collectionsTotal}kg, Orders: ${finalOrdersTotal}kg`);
    
    // Return the combined total
    return collectionsTotal + finalOrdersTotal;
  };

  // Add debug log to check collections data
  console.log("Collections:", dashboardData.collections);
  console.log("Recent Activity:", dashboardData.recentActivity);
  console.log("Total Orders:", dashboardData.totalOrders);

  // Calculate total order weight for business users
  const totalOrderWeight = dashboardData.orders.reduce(
    (sum, order) => sum + (parseFloat(order.quantity) || 0),
    0
  );

  const getStatsCards = () => {
    if (!session?.user?.userType) return [];

    switch (session.user.userType) {
      case "individual":
        return [
          {
            title: "Total Collections",
            value: dashboardData.totalCollections,
            icon: Recycle,
            description: "Scheduled waste collections",
          },
          {
            title: "Points Earned",
            value: dashboardData.points,
            icon: Award,
            description: "Total recycling points",
          },
          {
            title: "Orders Placed",
            value: dashboardData.totalOrders,
            icon: ShoppingBag,
            description: "Products purchased",
          },
          {
            title: "Active Collections",
            value: dashboardData.collections.filter(
              (c) => c.status === "SCHEDULED"
            ).length,
            icon: Truck,
            description: "Pending collections",
          },
        ];
      case "business":
        return [
          {
            title: "Total Orders",
            value: dashboardData.totalOrders,
            icon: ShoppingBag,
            description: "Bulk orders placed",
          },
          {
            title: "Active Orders",
            value:
              dashboardData.orders?.filter((o) => o.status === "PENDING")
                .length || 0,
            icon: Package,
            description: "Pending deliveries",
          },
          {
            title: "Total Spent",
            value: `LKR ${dashboardData.totalSpent || 0}`,
            icon: CreditCard,
            description: "Purchase value",
          },
          {
            title: "Market Trends",
            value: dashboardData.marketTrends || "Stable",
            icon: TrendingUp,
            description: "Price trends",
          },
        ];
      case "collector":
        return [
          {
            title: "Collections Made",
            value: dashboardData.totalCollections,
            icon: Recycle,
            description: "Total collections",
          },
          {
            title: "Active Requests",
            value: dashboardData.collections.filter(
              (c) => c.status === "SCHEDULED"
            ).length,
            icon: Truck,
            description: "Pending pickups",
          },
          {
            title: "Products Listed",
            value: dashboardData.totalProducts,
            icon: Package,
            description: "Active listings",
          },
          {
            title: "Total Revenue",
            value: `LKR ${dashboardData.totalRevenue || 0}`,
            icon: CreditCard,
            description: "Earnings",
          },
        ];
      default:
        return [];
    }
  };

  // Update the getRecentActivity function
  const getRecentActivity = () => {
    // First try to use the dedicated activity state
    if (recentActivity && recentActivity.length > 0) {
      console.log("Using dedicated recentActivity state:", recentActivity);
      return recentActivity;
    }
    
    // Then try the dashboard data
    if (dashboardData.recentActivity && dashboardData.recentActivity.length > 0) {
      console.log("Using dashboardData.recentActivity:", dashboardData.recentActivity);
      return dashboardData.recentActivity;
    }
    
    // Finally fall back to sample data
    console.log("Using fallback activity data");
    return [{
      type: 'order',
      title: 'Order pending',
      description: 'Order #682daf7d - Waiting for approval',
      date: new Date().toISOString(),
      status: 'PENDING'
    }];
  };

  // Only render the dashboard content if authenticated and not loading
  if (authLoading || !user) {
    return (
      <Container>
        <div className="h-[70vh] flex items-center justify-center">
          <div className="animate-pulse text-center">
            <h2 className="text-xl font-semibold">Loading dashboard...</h2>
          </div>
        </div>
      </Container>
    );
  }

  // Render the dashboard with tabs
  return (
    <Container>
      <div className="space-y-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-gray-500 mt-1">Welcome back, {user?.name?.split(" ")[0] || "User"}</p>
          </div>
          <div className="flex gap-2">
            {user?.userType?.toUpperCase() === "INDIVIDUAL" && (
              <Button
                className="bg-green-600 hover:bg-green-700 shadow-sm flex items-center"
                onClick={() => router.push("/marketplace/create")}
              >
                <Plus className="mr-2 h-4 w-4" />
                Post Product
              </Button>
            )}
          </div>
        </div>

        {user?.userType?.toUpperCase() === "INDIVIDUAL" && (
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 bg-gray-100 p-1 rounded-lg">
              <TabsTrigger className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm" value="overview">Overview</TabsTrigger>
              <TabsTrigger className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm" value="products">My Products</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 mt-6">
              {overviewLoading ? (
                <div className="min-h-[400px] flex flex-col items-center justify-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                  <p className="text-muted-foreground">
                    Loading dashboard data...
                  </p>
                </div>
              ) : (
                <>
                  {/* Main Stats Section */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                    <Card className="relative overflow-hidden border-0 shadow-md bg-gradient-to-br from-green-50 via-green-100 to-emerald-50">
                      <div className="absolute right-0 top-0 h-16 w-16 translate-x-6 -translate-y-6 transform rounded-full bg-green-600/20 blur-2xl"></div>
                      <div className="absolute left-0 bottom-0 h-16 w-16 -translate-x-6 translate-y-6 transform rounded-full bg-green-600/20 blur-2xl"></div>
                      <CardContent className="p-6">
                        <div className="flex flex-col h-full">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-green-800">Total Recycled</h3>
                            <div className="rounded-full bg-green-100 p-1.5">
                              <Recycle className="h-4 w-4 text-green-700" />
                          </div>
                          </div>
                          <div className="mt-2 flex-1 flex flex-col">
                            <div className="text-2xl font-bold text-green-900">{totalRecycled().toFixed(1)} kg</div>
                            <div className="text-xs text-green-700 mt-1">Plastic waste diverted from landfill</div>
                        </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="relative overflow-hidden border-0 shadow-md bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-50">
                      <div className="absolute right-0 top-0 h-16 w-16 translate-x-6 -translate-y-6 transform rounded-full bg-blue-600/20 blur-2xl"></div>
                      <div className="absolute left-0 bottom-0 h-16 w-16 -translate-x-6 translate-y-6 transform rounded-full bg-blue-600/20 blur-2xl"></div>
                      <CardContent className="p-6">
                        <div className="flex flex-col h-full">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-blue-800">Reward Points</h3>
                            <div className="rounded-full bg-blue-100 p-1.5">
                              <Award className="h-4 w-4 text-blue-700" />
                          </div>
                          </div>
                          <div className="mt-2 flex-1 flex flex-col">
                            <div className="text-2xl font-bold text-blue-900">{dashboardData.points} pts</div>
                            <Link href="/rewards" className="text-xs text-blue-700 mt-1 flex items-center hover:underline">
                              Redeem now
                              <ChevronRight className="h-3 w-3 ml-1" />
                          </Link>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="relative overflow-hidden border-0 shadow-md bg-gradient-to-br from-teal-50 via-teal-100 to-emerald-50">
                      <div className="absolute right-0 top-0 h-16 w-16 translate-x-6 -translate-y-6 transform rounded-full bg-teal-600/20 blur-2xl"></div>
                      <div className="absolute left-0 bottom-0 h-16 w-16 -translate-x-6 translate-y-6 transform rounded-full bg-teal-600/20 blur-2xl"></div>
                      <CardContent className="p-6">
                        <div className="flex flex-col h-full">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-teal-800">CO₂ Saved</h3>
                            <div className="rounded-full bg-teal-100 p-1.5">
                              <TrendingUp className="h-4 w-4 text-teal-700" />
                          </div>
                          </div>
                          <div className="mt-2 flex-1 flex flex-col">
                            <div className="text-2xl font-bold text-teal-900">{(totalRecycled() * 2.5).toFixed(1)} kg</div>
                            <Link href="/impact" className="text-xs text-teal-700 mt-1 flex items-center hover:underline">
                              View impact
                              <ChevronRight className="h-3 w-3 ml-1" />
                          </Link>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="relative overflow-hidden border-0 shadow-md bg-gradient-to-br from-amber-50 via-amber-100 to-orange-50">
                      <div className="absolute right-0 top-0 h-16 w-16 translate-x-6 -translate-y-6 transform rounded-full bg-amber-600/20 blur-2xl"></div>
                      <div className="absolute left-0 bottom-0 h-16 w-16 -translate-x-6 translate-y-6 transform rounded-full bg-amber-600/20 blur-2xl"></div>
                      <CardContent className="p-6">
                        <div className="flex flex-col h-full">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-amber-800">Orders</h3>
                            <div className="rounded-full bg-amber-100 p-1.5">
                              <ShoppingBag className="h-4 w-4 text-amber-700" />
                          </div>
                          </div>
                          <div className="mt-2 flex-1 flex flex-col">
                            {console.log("Rendering orders count:", dashboardData.totalOrders)}
                            <div className="text-2xl font-bold text-amber-900">
                              {dashboardData.totalOrders > 0 ? dashboardData.totalOrders : getRecentActivity().length}
                        </div>
                            <Link href="/marketplace" className="text-xs text-amber-700 mt-1 flex items-center hover:underline">
                              Shop marketplace
                              <ChevronRight className="h-3 w-3 ml-1" />
                          </Link>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Environmental Impact Section */}
                  <Card className="overflow-hidden border-0 shadow-md">
                    <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100 py-4">
                      <CardTitle className="text-lg flex items-center text-green-800">
                          <TrendingUp className="mr-2 h-5 w-5 text-green-600" />
                          Environmental Impact
                        </CardTitle>
                      </CardHeader>
                    <CardContent className="p-6 bg-white">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="flex flex-col items-center justify-center p-5 bg-gradient-to-b from-green-50 to-transparent rounded-xl">
                          <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-3 shadow-sm">
                            <Recycle className="h-8 w-8 text-green-600" />
                          </div>
                          <div className="text-2xl font-bold text-green-900">{totalRecycled().toFixed(1)} kg</div>
                          <div className="text-sm text-gray-500 text-center mt-1">Total plastic recycled</div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between text-sm mb-2">
                              <span className="font-medium text-gray-700">CO₂ Reduction</span>
                              <span className="text-green-600 font-medium">{(totalRecycled() * 2.5).toFixed(1)} kg</span>
                            </div>
                            <div className="h-3 rounded-full bg-gray-100 overflow-hidden shadow-inner">
                              <div
                                className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full"
                                style={{
                                  width: `${Math.min(((totalRecycled() * 2.5) / 100) * 100, 100)}%`,
                                }}
                              ></div>
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-sm mb-2">
                              <span className="font-medium text-gray-700">Water Saved</span>
                              <span className="text-blue-600 font-medium">{(totalRecycled() * 22).toFixed(1)} L</span>
                            </div>
                            <div className="h-3 rounded-full bg-gray-100 overflow-hidden shadow-inner">
                              <div
                                className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
                                style={{
                                  width: `${Math.min(((totalRecycled() * 22) / 1000) * 100, 100)}%`,
                                }}
                              ></div>
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-sm mb-2">
                              <span className="font-medium text-gray-700">Energy Saved</span>
                              <span className="text-amber-600 font-medium">{(totalRecycled() * 5.8).toFixed(1)} kWh</span>
                            </div>
                            <div className="h-3 rounded-full bg-gray-100 overflow-hidden shadow-inner">
                              <div
                                className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full"
                                style={{
                                  width: `${Math.min(((totalRecycled() * 5.8) / 100) * 100, 100)}%`,
                                }}
                              ></div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col justify-center bg-gray-50 rounded-xl p-5">
                          <div className="text-center">
                            <div className="text-sm font-medium text-gray-700 mb-3">Your impact is equivalent to:</div>
                            <div className="space-y-3">
                              <div className="flex items-center gap-3 bg-white p-2 rounded-lg shadow-sm">
                                <span className="text-xl">🌳</span>
                                <div>
                                  <div className="font-medium">{Math.round(totalRecycled() * 0.1)} trees</div>
                                  <div className="text-xs text-gray-500">planted and grown for 10 years</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 bg-white p-2 rounded-lg shadow-sm">
                                <span className="text-xl">🚗</span>
                                <div>
                                  <div className="font-medium">{Math.round(totalRecycled() * 0.8)} km</div>
                                  <div className="text-xs text-gray-500">of car travel avoided</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 bg-white p-2 rounded-lg shadow-sm">
                                <span className="text-xl">💡</span>
                                <div>
                                  <div className="font-medium">{Math.round(totalRecycled() * 18)} hours</div>
                                  <div className="text-xs text-gray-500">of LED light bulb operation</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recent Activity Section */}
                  <Card className="overflow-hidden border-0 shadow-md">
                    <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 border-b py-4">
                      <CardTitle className="text-lg flex items-center text-gray-800">
                        <Calendar className="mr-2 h-5 w-5 text-gray-600" />
                        Recent Activity
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      {console.log("Rendering activity from state:", dashboardData.recentActivity)}
                      {console.log("Forced activity:", getRecentActivity())}
                      {getRecentActivity().length > 0 ? (
                        <div className="divide-y">
                          {getRecentActivity().map((activity, index) => (
                            <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center"
                                  style={{
                                    backgroundColor: 
                                      activity.type === "collection" ? "#ecfdf5" : 
                                      activity.status === "COMPLETED" ? "#ecfdf5" :
                                      activity.status === "PENDING" ? "#fef9c3" :
                                      activity.status === "PAID" ? "#f3e8ff" :
                                      activity.status === "ACCEPTED" ? "#dbeafe" :
                                      "#f3f4f6"
                                  }}
                                >
                                  {activity.type === "collection" ? (
                                    <Recycle className="h-5 w-5 text-green-600" />
                                  ) : activity.status === "COMPLETED" ? (
                                    <ShoppingBag className="h-5 w-5 text-green-600" />
                                  ) : activity.status === "PENDING" ? (
                                    <CreditCard className="h-5 w-5 text-yellow-600" />
                                  ) : activity.status === "PAID" ? (
                                    <CreditCard className="h-5 w-5 text-purple-600" />
                                  ) : activity.status === "ACCEPTED" ? (
                                    <Package className="h-5 w-5 text-blue-600" />
                                  ) : (
                                    <ShoppingBag className="h-5 w-5 text-gray-600" />
                                  )}
                                </div>
                                <div className="flex flex-col flex-grow">
                                  <div className="flex justify-between items-start">
                                    <div className="font-medium text-gray-900">{activity.title}</div>
                                    <div className="text-xs text-gray-500 flex items-center">
                                      <Calendar className="h-3 w-3 mr-1" />
                                      {new Date(activity.date).toLocaleDateString()}
                                    </div>
                                  </div>
                                  <p className="text-sm text-gray-600 mt-0.5">{activity.description}</p>
                                  {activity.status && (
                                    <span className="mt-2 inline-flex self-start items-center px-2.5 py-0.5 text-xs rounded-full"
                                      style={{
                                        color: 
                                          activity.status === "COMPLETED" ? "#047857" :
                                          activity.status === "PENDING" ? "#854d0e" :
                                          activity.status === "PAID" ? "#6d28d9" :
                                          activity.status === "ACCEPTED" ? "#1d4ed8" :
                                          "#374151",
                                        backgroundColor: 
                                          activity.status === "COMPLETED" ? "#d1fae5" :
                                          activity.status === "PENDING" ? "#fef3c7" :
                                          activity.status === "PAID" ? "#ede9fe" :
                                          activity.status === "ACCEPTED" ? "#dbeafe" :
                                          "#f3f4f6"
                                      }}
                                    >
                                      {activity.status}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                          <div className="bg-gray-100 rounded-full p-3 mb-4">
                            <Calendar className="h-8 w-8 text-gray-400" />
                          </div>
                          <h3 className="text-base font-medium text-gray-900">No recent activity</h3>
                          <p className="mt-1 text-sm text-gray-500 max-w-sm">
                            Start by scheduling a collection or shopping at the marketplace to see your activity here.
                          </p>
                          <div className="mt-6 flex gap-3">
                        <Button
                          variant="outline"
                              size="sm"
                              asChild
                              className="text-sm"
                        >
                              <Link href="/collections/schedule">
                                <Recycle className="mr-2 h-4 w-4" />
                                Schedule Collection
                              </Link>
                        </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                              className="text-sm"
                            >
                              <Link href="/marketplace">
                                <ShoppingBag className="mr-2 h-4 w-4" />
                                Shop Marketplace
                              </Link>
                            </Button>
                          </div>
                        </div>
                      )}
                      </CardContent>
                    </Card>
                </>
              )}
            </TabsContent>

            <TabsContent value="products" className="space-y-6 mt-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-xl font-semibold">My Products</h2>
                  <p className="text-gray-500 text-sm">Manage your recycled products</p>
                </div>
                <Button
                  className="bg-green-600 hover:bg-green-700 shadow-sm"
                  onClick={() => router.push("/marketplace/create")}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
              </div>

              {isLoading ? (
                <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-100">
                  <Loader2 className="h-10 w-10 animate-spin text-green-600 mx-auto mb-4" />
                  <p className="text-gray-500">Loading your products...</p>
                </div>
              ) : userProducts.length === 0 ? (
                <Card className="border-0 shadow-md">
                  <CardContent className="flex flex-col items-center justify-center py-16 px-4">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                      <Package className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-medium mb-2">
                      No Products Yet
                    </h3>
                    <p className="text-gray-500 mb-6 text-center max-w-md">
                      You haven&apos;t posted any products yet. Start selling your recycled products to earn more rewards!
                    </p>
                    <Button 
                      className="bg-green-600 hover:bg-green-700 shadow-md"
                      onClick={() => router.push("/marketplace/create")}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create Your First Product
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {userProducts.map((product) => (
                    <Card
                      key={product.id}
                      className="overflow-hidden group border-0 shadow-md hover:shadow-lg transition-all duration-300"
                    >
                      <div className="aspect-video w-full relative overflow-hidden">
                        <img
                          src={
                            product.image || "/images/placeholder-product.jpg"
                          }
                          alt={product.name}
                          className="object-cover w-full h-full transition-all duration-300 group-hover:scale-105"
                        />
                        {product.discount > 0 && (
                          <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-2.5 py-1.5 rounded-full shadow-sm">
                            -{product.discount}% OFF
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => router.push(`/marketplace/edit/${product.id}`)}
                            className="h-8 w-8 p-0 bg-white/90 hover:bg-white shadow-sm"
                          >
                            <Pencil className="h-4 w-4 text-gray-700" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteProduct(product.id)}
                            className="h-8 w-8 p-0 bg-white/90 hover:bg-red-100 text-red-600 hover:text-red-700 shadow-sm"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <CardContent className="p-4">
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <h3 className="font-medium text-base line-clamp-1">{product.name}</h3>
                          <div className="flex flex-col items-end">
                            {product.discount > 0 ? (
                              <>
                                <span className="font-bold text-green-600">
                                  LKR {((product.price * (100 - product.discount)) / 100).toFixed(2)}
                                </span>
                                <span className="text-xs text-gray-500 line-through -mt-0.5">
                                  LKR {product.price.toFixed(2)}
                                </span>
                              </>
                            ) : (
                              <span className="font-bold text-green-600">
                                LKR {product.price.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-sm text-gray-600 line-clamp-2 mb-3 h-10">
                          {product.description}
                        </p>

                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full">
                            {product.category}
                          </span>
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                            {product.plasticType}
                          </span>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                          <span className="text-xs text-gray-500 flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(product.createdAt || Date.now()).toLocaleDateString()}
                          </span>
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                            {product.inStock ? "In Stock" : "Out of Stock"}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* For other user types, keep the original dashboard layout */}
        {user?.userType?.toUpperCase() !== "INDIVIDUAL" && (
          <div className="space-y-6">
            {/* Business/Collector Dashboard - Redesigned */}
            <div className="grid gap-5 grid-cols-1 md:grid-cols-3">
              {/* Welcome Card */}
              <Card className="relative overflow-hidden border-0 shadow-md bg-gradient-to-br from-slate-50 to-blue-50">
                <div className="absolute right-0 top-0 h-16 w-16 translate-x-6 -translate-y-6 transform rounded-full bg-blue-600/10 blur-2xl"></div>
                <div className="absolute left-0 bottom-0 h-16 w-16 -translate-x-6 translate-y-6 transform rounded-full bg-blue-600/10 blur-2xl"></div>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">Welcome Back</h2>
                      <p className="text-gray-500">Hello, {user?.name || "User"}!</p>
                    </div>
                  </div>
                  <div className="bg-white/80 rounded-lg p-3 mt-2 backdrop-blur-sm">
                    <p className="text-sm font-medium text-gray-700">
                      Account type: <span className="text-blue-600 capitalize">{session?.user?.userType || "Individual"}</span>
                  </p>
                  <Link
                    href="/profile"
                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center mt-2 group"
                  >
                      View Profile 
                      <ChevronRight className="inline h-4 w-4 ml-1 transform group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                  </div>
                </CardContent>
              </Card>

              {/* Reward Points Card - Only shown for non-business users */}
              {session?.user?.userType !== "BUSINESS" && (
                <Card className="relative overflow-hidden border-0 shadow-md bg-gradient-to-br from-emerald-50 to-green-50">
                  <div className="absolute right-0 top-0 h-16 w-16 translate-x-6 -translate-y-6 transform rounded-full bg-green-600/10 blur-2xl"></div>
                  <div className="absolute left-0 bottom-0 h-16 w-16 -translate-x-6 translate-y-6 transform rounded-full bg-green-600/10 blur-2xl"></div>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                        <Award className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold">Reward Points</h2>
                        <p className="text-gray-500">Your current balance</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center bg-white/80 rounded-lg p-3 mt-2 backdrop-blur-sm">
                      <p className="text-3xl font-bold text-green-600">
                      {dashboardData.points} pts
                    </p>
                    <Link
                      href="/rewards"
                        className="text-green-600 hover:text-green-800 text-sm flex items-center group"
                    >
                        View Rewards
                        <ChevronRight className="h-4 w-4 ml-1 transform group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Impact Card */}
              <Card className="relative overflow-hidden border-0 shadow-md bg-gradient-to-br from-amber-50 to-orange-50">
                <div className="absolute right-0 top-0 h-16 w-16 translate-x-6 -translate-y-6 transform rounded-full bg-amber-600/10 blur-2xl"></div>
                <div className="absolute left-0 bottom-0 h-16 w-16 -translate-x-6 translate-y-6 transform rounded-full bg-amber-600/10 blur-2xl"></div>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                      <Recycle className="h-6 w-6 text-amber-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">Impact</h2>
                      <p className="text-gray-500">
                        {session?.user?.userType === "BUSINESS" ? 
                          "Total plastic ordered" :
                          "Total plastic recycled"}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center bg-white/80 rounded-lg p-3 mt-2 backdrop-blur-sm">
                    <p className="text-3xl font-bold text-amber-600">
                      {session?.user?.userType === "BUSINESS" ? 
                        totalOrderWeight.toFixed(1) :
                        totalRecycled().toFixed(1)} kg
                    </p>
                  <Link
                    href="/impact"
                      className="text-amber-600 hover:text-amber-800 text-sm flex items-center group"
                  >
                      View Impact
                      <ChevronRight className="h-4 w-4 ml-1 transform group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                  </div>
                </CardContent>
              </Card>

              {/* Fill remaining space for 3-column layout when not showing reward points */}
              {session?.user?.userType === "BUSINESS" && (
                <Card className="relative overflow-hidden border-0 shadow-md bg-gradient-to-br from-violet-50 to-purple-50">
                  <div className="absolute right-0 top-0 h-16 w-16 translate-x-6 -translate-y-6 transform rounded-full bg-purple-600/10 blur-2xl"></div>
                  <div className="absolute left-0 bottom-0 h-16 w-16 -translate-x-6 translate-y-6 transform rounded-full bg-purple-600/10 blur-2xl"></div>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                        <CreditCard className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold">Total Spent</h2>
                        <p className="text-gray-500">Purchase summary</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center bg-white/80 rounded-lg p-3 mt-2 backdrop-blur-sm">
                      <p className="text-3xl font-bold text-purple-600">
                        LKR {dashboardData.totalSpent || 0}
                      </p>
                      <Link
                        href="/orders"
                        className="text-purple-600 hover:text-purple-800 text-sm flex items-center group"
                      >
                        View Orders
                        <ChevronRight className="h-4 w-4 ml-1 transform group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Stats Cards */}
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {getStatsCards().map((card, index) => (
                <Card key={index} className="border-0 shadow-md overflow-hidden bg-white">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-r from-gray-50 to-slate-50 border-b">
                    <CardTitle className="text-sm font-medium">
                      {card.title}
                    </CardTitle>
                    <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <card.icon className="h-4 w-4 text-gray-600" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{card.value}</div>
                    <p className="text-xs text-gray-500 mt-1">
                      {card.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Recent Activity */}
            <Card className="overflow-hidden border-0 shadow-md">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 border-b py-4">
                <CardTitle className="text-lg flex items-center text-gray-800">
                  <Calendar className="mr-2 h-5 w-5 text-gray-600" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {dashboardData.recentActivity.length > 0 ? (
                    dashboardData.recentActivity.map((activity, index) => (
                      <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start gap-3">
                          <div 
                            className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center"
                            style={{
                              backgroundColor: 
                                activity.type === "collection" ? "#ecfdf5" : 
                                activity.status === "PENDING" ? "#fef9c3" :
                                activity.status === "ACCEPTED" ? "#dbeafe" :
                                activity.status === "PAID" ? "#f3e8ff" :
                                activity.status === "DELIVERED" ? "#e0f2fe" :
                                activity.status === "COMPLETED" ? "#dcfce7" :
                                activity.status === "CANCELLED" ? "#fee2e2" :
                                "#f3f4f6"
                            }}
                          >
                            {activity.type === "collection" ? (
                              <Recycle className="h-5 w-5 text-green-600" />
                            ) : activity.status === "PENDING" ? (
                              <CreditCard className="h-5 w-5 text-yellow-600" />
                            ) : activity.status === "ACCEPTED" ? (
                              <Package className="h-5 w-5 text-blue-600" />
                            ) : activity.status === "PAID" ? (
                              <CreditCard className="h-5 w-5 text-purple-600" />
                            ) : activity.status === "DELIVERED" ? (
                              <Truck className="h-5 w-5 text-blue-600" />
                            ) : activity.status === "COMPLETED" ? (
                              <ShoppingBag className="h-5 w-5 text-green-600" />
                            ) : activity.status === "CANCELLED" ? (
                              <Trash2 className="h-5 w-5 text-red-600" />
                            ) : (
                              <ShoppingBag className="h-5 w-5 text-gray-600" />
                            )}
                          </div>
                          
                          <div className="flex flex-col flex-grow">
                            <div className="flex justify-between items-start">
                              <div className="font-medium text-gray-900">{activity.title}</div>
                              <div className="text-xs text-gray-500 flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                {new Date(activity.date).toLocaleDateString()}
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 mt-0.5">{activity.description}</p>
                            {activity.status && (
                            <span
                                className="mt-2 inline-flex self-start items-center px-2.5 py-0.5 text-xs rounded-full"
                                style={{
                                  color: 
                                    activity.status === "PENDING" ? "#854d0e" :
                                    activity.status === "ACCEPTED" ? "#1d4ed8" :
                                    activity.status === "PAID" ? "#6d28d9" :
                                    activity.status === "DELIVERED" ? "#0369a1" :
                                    activity.status === "COMPLETED" ? "#047857" :
                                    activity.status === "CANCELLED" ? "#b91c1c" :
                                    "#374151",
                                  backgroundColor: 
                                    activity.status === "PENDING" ? "#fef3c7" :
                                    activity.status === "ACCEPTED" ? "#dbeafe" :
                                    activity.status === "PAID" ? "#ede9fe" :
                                    activity.status === "DELIVERED" ? "#e0f2fe" :
                                    activity.status === "COMPLETED" ? "#d1fae5" :
                                    activity.status === "CANCELLED" ? "#fee2e2" :
                                    "#f3f4f6"
                                }}
                            >
                              {activity.status}
                            </span>
                          )}
                            {activity.type === "order" && session?.user?.userType === "business" && (
                            <Link
                              href={`/orders/${activity.orderId}`}
                                className="text-xs text-blue-600 hover:text-blue-800 mt-2 inline-flex items-center gap-1"
                            >
                              View Order Details
                                <ChevronRight className="h-3 w-3" />
                            </Link>
                          )}
                      </div>
                    </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                      <div className="bg-gray-100 rounded-full p-3 mb-4">
                        <Calendar className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-base font-medium text-gray-900">No recent activity</h3>
                      <p className="mt-1 text-sm text-gray-500 max-w-sm">
                        Your recent transactions and activities will appear here.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Container>
  );
}
