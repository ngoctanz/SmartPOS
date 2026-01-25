"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import productService, {
  Product,
  CreateProductRequest,
  UpdateProductRequest,
} from "@/service/product.service";
import importReceiptService, {
  CreateImportReceiptRequest,
} from "@/service/import-receipt.service";
import branchService, { Branch } from "@/service/branch.service";
import categoryService, { Category } from "@/service/category.service";
import { useAuthContext } from "@/contexts/auth-context";
import { ROUTES } from "@/configs/routes.config";
import {
  ImportItemsTable,
  ImportSummary,
  ConfirmDialog,
  ImportItem,
} from "@/components/import-receipt";
import { SmartProductInput } from "@/components/common/smart-product-input";
import {
  ProductFormModal,
  InventoryProductFormData,
} from "@/components/forms/product-form-modal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import stockService from "@/service/stock.service";

export default function CreateImportReceiptPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthContext();
  const isAdmin = user?.role === "admin";

  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = React.useState<string>("");
  const [importItems, setImportItems] = React.useState<ImportItem[]>([]);
  const [supplierName, setSupplierName] = React.useState("");
  const [note, setNote] = React.useState("");
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // States for product not found flow
  const [notFoundBarcode, setNotFoundBarcode] = React.useState<string>("");
  const [showNotFoundDialog, setShowNotFoundDialog] = React.useState(false);
  const [showProductFormModal, setShowProductFormModal] = React.useState(false);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [isCreatingProduct, setIsCreatingProduct] = React.useState(false);

  React.useEffect(() => {
    const loadBranches = async () => {
      try {
        const response = await branchService.getAll();
        if (response.success && response.data) {
          setBranches(response.data);
          if (!isAdmin && user?.branchId) {
            setSelectedBranch(user.branchId);
          } else if (response.data.length > 0 && isAdmin) {
            setSelectedBranch(response.data[0]._id);
          }
        }
      } catch {
        toast.error("Không thể tải danh sách chi nhánh");
      }
    };
    loadBranches();
  }, [user?.branchId, isAdmin]);

  React.useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await categoryService.getAll();
        if (response.success && response.data) {
          setCategories(response.data);
        }
      } catch {
        toast.error("Không thể tải danh sách loại sản phẩm");
      }
    };
    loadCategories();
  }, []);

  // Load data from error receipt if fromError param exists
  React.useEffect(() => {
    const fromError = searchParams.get("fromError");
    if (!fromError) return;

    const loadErrorReceiptData = async () => {
      try {
        // Get data from query params
        const branchId = searchParams.get("branchId");
        const supplierName = searchParams.get("supplierName");
        const note = searchParams.get("note");
        const productsJson = searchParams.get("products");

        if (branchId) setSelectedBranch(branchId);
        if (supplierName) setSupplierName(supplierName);
        if (note) setNote(note);

        if (productsJson) {
          const products = JSON.parse(decodeURIComponent(productsJson));

          // Load full product details for each item
          const loadedItems: ImportItem[] = [];
          const deletedProducts: string[] = [];

          for (const item of products) {
            try {
              const response = await productService.getById(item.productId);
              if (response.success && response.data) {
                const product = response.data;
                loadedItems.push({
                  productId: product._id,
                  productName: product.name,
                  barcode: product.barcode || "",
                  quantity: item.quantity,
                  importPrice: item.importPrice,
                  unit: product.unit,
                  image: product.images?.[0],
                  isImportPriceManual: true, // From error receipt, consider as manual
                });
              } else {
                // Product not found (deleted)
                deletedProducts.push(item.productId);
              }
            } catch (error) {
              // Product not found (deleted)
              deletedProducts.push(item.productId);
              console.error("Failed to load product:", item.productId, error);
            }
          }

          setImportItems(loadedItems);

          // Show appropriate message
          if (loadedItems.length > 0 && deletedProducts.length === 0) {
            toast.success(`Đã tải ${loadedItems.length} sản phẩm từ phiếu lỗi`);
          } else if (loadedItems.length > 0 && deletedProducts.length > 0) {
            toast.warning(
              `Đã tải ${loadedItems.length} sản phẩm. ${deletedProducts.length} sản phẩm đã bị xóa khỏi hệ thống.`,
              { duration: 5000 },
            );
          } else if (loadedItems.length === 0 && deletedProducts.length > 0) {
            toast.error(
              `Không thể tải sản phẩm. Tất cả ${deletedProducts.length} sản phẩm trong phiếu đã bị xóa khỏi hệ thống.`,
              { duration: 5000 },
            );
          }
        }
      } catch (error) {
        console.error("Failed to load error receipt data:", error);
        toast.error("Không thể tải dữ liệu từ phiếu lỗi");
      }
    };

    loadErrorReceiptData();
  }, [searchParams]);



  const handleCreateNewProduct = () => {
    setShowNotFoundDialog(false);
    setShowProductFormModal(true);
  };

  const handleProductFormSubmit = async (
    data:
      | CreateProductRequest
      | UpdateProductRequest
      | InventoryProductFormData,
  ) => {
    setIsCreatingProduct(true);
    try {
      let createdProduct: Product | undefined;

      // Check if it's inventory creation (admin with branch selected)
      const inventoryData = data as InventoryProductFormData;
      if (isAdmin && inventoryData.branchId) {
        // Create product + stock
        await stockService.createProductWithStock({
          name: inventoryData.name,
          barcode: inventoryData.barcode,
          categoryId: inventoryData.categoryId,
          unit: inventoryData.unit,
          currentSalePrice: inventoryData.currentSalePrice,
          status: inventoryData.status,
          desc: inventoryData.desc,
          images: inventoryData.images,
          branchId: inventoryData.branchId,
          productCode: inventoryData.productCode,
          salePrice: inventoryData.currentSalePrice, // Giá bán chi nhánh = giá niêm yết
          importPrice: inventoryData.importPrice,
        });

        // After creation, we need to fetch the product details to add to import list
        // Since createProductWithStock might return void or different structure,
        // we'll try to fetch by barcode or search
        const searchRes = await productService.search({
          name: inventoryData.name,
        });
        if (searchRes.success && searchRes.data && searchRes.data.length > 0) {
          // Find the one we just created (best effort match)
          createdProduct =
            searchRes.data.find((p) => p.barcode === inventoryData.barcode) ||
            searchRes.data[0];
        } else if (inventoryData.barcode) {
          const barcodeRes = await productService.getByBarcode(
            inventoryData.barcode,
          );
          if (barcodeRes.success) createdProduct = barcodeRes.data;
        }
      } else {
        // Normal creation
        const response = await productService.create(
          data as CreateProductRequest,
        );
        if (response.success && response.data) {
          createdProduct = response.data;
        } else {
          throw new Error(response.message || "Tạo sản phẩm thất bại");
        }
      }

      if (createdProduct) {
        toast.success("Tạo sản phẩm mới thành công!");

        // Auto add to import list
        setImportItems((prev) => [
          ...prev,
          {
            productId: createdProduct!._id,
            productName: createdProduct!.name,
            barcode: createdProduct!.barcode || notFoundBarcode,
            quantity: 1,
            // If inventory mode, use the import price entered
            importPrice: (data as InventoryProductFormData).importPrice || 0,
            unit: createdProduct!.unit,
            image: createdProduct!.images?.[0],
            isImportPriceManual: true, // User entered in form
          },
        ]);

        setShowProductFormModal(false);
        setNotFoundBarcode("");
      } else {
        // Fallback success message but maybe failed to Auto add
        toast.success("Tạo sản phẩm thành công!");
        setShowProductFormModal(false);
        setNotFoundBarcode("");
      }
    } catch (error) {
      toast.error((error as Error).message || "Lỗi tạo sản phẩm");
    } finally {
      setIsCreatingProduct(false);
    }
  };

  const handleSearch = React.useCallback(
    async (term: string) => {
      if (!term?.trim()) return [];

      try {
        // Admin: dùng selectedBranch để lấy lastImportPrice
        // Staff/Manager: undefined (middleware tự inject branchId)
        const branchId = isAdmin && selectedBranch ? selectedBranch : undefined;

        const response = await productService.search({
          name: term,
          branchId,
        });

        return response.success && response.data ? response.data : [];
      } catch (error) {
        console.error("Search error:", error);
        return [];
      }
    },
    [isAdmin, selectedBranch],
  );

  const getProductByBarcode = React.useCallback(
    async (barcode: string): Promise<Product | null> => {
      if (!barcode?.trim()) return null;

      try {
        // Admin: dùng selectedBranch để lấy lastImportPrice
        // Staff/Manager: undefined (middleware tự inject branchId)
        const branchId = isAdmin && selectedBranch ? selectedBranch : undefined;
        const response = await productService.getByBarcode(barcode, branchId);

        return response.success && response.data ? response.data : null;
      } catch (error) {
        console.error("Get by barcode error:", error);
        return null;
      }
    },
    [isAdmin, selectedBranch],
  );

  // Handle barcode not found - show dialog to create new product
  const handleBarcodeNotFound = React.useCallback((barcode: string) => {
    setNotFoundBarcode(barcode);
    setShowNotFoundDialog(true);
  }, []);

  const handleProductSelect = React.useCallback(
    (product: Product) => {
      if (!product?._id) return;

      const existingItem = importItems.find(
        (item) => item.productId === product._id,
      );

      if (existingItem) {
        setImportItems((prev) =>
          prev.map((item) =>
            item.productId === product._id
              ? { ...item, quantity: item.quantity + 1 }
              : item,
          ),
        );
        toast.success(`+1 ${product.name}`);
      } else {
        // Ưu tiên: lastImportPrice > currentSalePrice > 0
        const importPrice =
          product.lastImportPrice || product.currentSalePrice || 0;

        setImportItems((prev) => [
          ...prev,
          {
            productId: product._id,
            productName: product.name,
            barcode: product.barcode || "",
            quantity: 1,
            importPrice,
            unit: product.unit,
            image: product.images?.[0],
            isImportPriceManual: false, // Auto-filled price
          },
        ]);
        toast.success(`Đã thêm: ${product.name}`);
      }
    },
    [importItems],
  );

  const updateQuantity = React.useCallback((productId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      setImportItems((prev) =>
        prev.filter((item) => item.productId !== productId),
      );
      return;
    }
    setImportItems((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.max(1, newQuantity) }
          : item,
      ),
    );
  }, []);

  const updateImportPrice = React.useCallback((productId: string, newPrice: number) => {
    setImportItems((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { 
              ...item, 
              importPrice: Math.max(0, newPrice),
              isImportPriceManual: true, // Mark as manually entered
            }
          : item,
      ),
    );
  }, []);

  const removeItem = React.useCallback((productId: string) => {
    setImportItems((prev) =>
      prev.filter((item) => item.productId !== productId),
    );
  }, []);

  const clearItems = React.useCallback(() => {
    setImportItems([]);
  }, []);

  const validateItems = React.useCallback(() => {
    if (importItems.length === 0) {
      toast.error("Vui lòng thêm ít nhất một sản phẩm");
      return false;
    }

    // Chấp nhận cả giá auto-fill (isImportPriceManual: false) và giá manual
    const invalidItems = importItems.filter(
      (item) => !item.importPrice || item.importPrice <= 0
    );
    if (invalidItems.length > 0) {
      toast.error(
        `Vui lòng nhập giá cho: ${invalidItems
          .map((i) => i.productName)
          .join(", ")}`,
      );
      return false;
    }

    return true;
  }, [importItems]);

  const handleSubmitClick = React.useCallback(() => {
    if (validateItems()) {
      setShowConfirmDialog(true);
    }
  }, [validateItems]);

  const handleSubmit = React.useCallback(async () => {
    if (isAdmin && !selectedBranch) {
      toast.error("Vui lòng chọn chi nhánh");
      return;
    }

    if (importItems.length === 0) {
      toast.error("Vui lòng thêm sản phẩm vào phiếu nhập");
      return;
    }

    setIsSubmitting(true);
    try {
      const receiptData: CreateImportReceiptRequest = {
        ...(isAdmin && selectedBranch && { branchId: selectedBranch }),
        listProduct: importItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          importPrice: item.importPrice,
        })),
        ...(supplierName?.trim() && { supplierName: supplierName.trim() }),
        ...(note?.trim() && { note: note.trim() }),
      };

      const response = await importReceiptService.create(receiptData);

      if (response.success) {
        toast.success("Tạo phiếu nhập thành công!");
        router.push(ROUTES.IMPORTS);
      } else {
        toast.error(response.message || "Tạo phiếu nhập thất bại");
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast.error((error as Error).message || "Lỗi tạo phiếu nhập");
    } finally {
      setIsSubmitting(false);
    }
  }, [isAdmin, selectedBranch, importItems, supplierName, note, router]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F9 or Enter to submit
      if ((e.key === "F9" || e.key === "Enter") && importItems.length > 0) {
        const target = e.target as HTMLElement;

        // Bỏ qua nếu đang focus vào input/textarea VÀ có giá trị
        if (
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement
        ) {
          const inputValue = target.value?.trim() || "";
          if (inputValue.length > 0) return;
        }

        // Bỏ qua nếu đang trong contentEditable
        if (target.isContentEditable) return;

        e.preventDefault();
        e.stopPropagation();
        handleSubmitClick();
      }

      // Escape to close dialog
      if (e.key === "Escape" && showConfirmDialog) {
        setShowConfirmDialog(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [importItems.length, showConfirmDialog, handleSubmitClick]);

  return (
    <div className="flex flex-col h-full p-4 pt-0">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(ROUTES.IMPORTS)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Tạo phiếu nhập hàng</h1>
          <p className="text-sm text-muted-foreground">
            Quét barcode hoặc tìm kiếm sản phẩm để thêm vào phiếu
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
        {/* Left Panel */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Search Section */}
          <div className="bg-muted/50 rounded-lg p-4 mb-4">
            <SmartProductInput
              onProductSelect={handleProductSelect}
              searchFn={handleSearch}
              getByBarcodeFn={getProductByBarcode}
              onBarcodeNotFound={handleBarcodeNotFound}
              placeholder="Quét mã barcode hoặc nhập tên sản phẩm..."
              autoFocus
              disableAutoRefocus={true}
            />
          </div>

          {/* Items Table */}
          <ImportItemsTable
            items={importItems}
            onUpdateQuantity={updateQuantity}
            onUpdatePrice={updateImportPrice}
            onRemove={removeItem}
            onClearAll={clearItems}
          />
        </div>

        {/* Right Panel - Summary */}
        <div className="lg:w-96 lg:flex-shrink-0">
          <ImportSummary
            items={importItems}
            branches={branches}
            selectedBranch={selectedBranch}
            onBranchChange={setSelectedBranch}
            supplierName={supplierName}
            onSupplierChange={setSupplierName}
            note={note}
            onNoteChange={setNote}
            isAdmin={isAdmin}
            onSubmit={handleSubmitClick}
            disabled={importItems.length === 0 || (isAdmin && !selectedBranch)}
          />
        </div>
      </div>

      <ConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        items={importItems}
        supplierName={supplierName}
        onConfirm={handleSubmit}
        isSubmitting={isSubmitting}
      />

      {/* Dialog for product not found */}
      <AlertDialog
        open={showNotFoundDialog}
        onOpenChange={setShowNotFoundDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Không tìm thấy sản phẩm</AlertDialogTitle>
            <AlertDialogDescription>
              Mã barcode{" "}
              <span className="font-mono font-bold text-foreground">
                {notFoundBarcode}
              </span>{" "}
              chưa có trong hệ thống.
              <br />
              Bạn có muốn tạo sản phẩm mới với mã này không?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleCreateNewProduct}>
              Tạo sản phẩm mới
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Product form modal for creating new product */}
      <ProductFormModal
        open={showProductFormModal}
        onOpenChange={setShowProductFormModal}
        product={{ barcode: notFoundBarcode } as Product}
        categories={categories}
        onSubmit={handleProductFormSubmit}
        isSubmitting={isCreatingProduct}
        isImportMode={true}
        isInventoryMode={true}
        branches={branches}
        isAdmin={isAdmin}
        defaultBranchId={selectedBranch}
      />
    </div>
  );
}
