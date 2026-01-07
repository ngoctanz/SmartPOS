"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import productService, { Product } from "@/service/product.service";
import importReceiptService, {
  CreateImportReceiptRequest,
} from "@/service/import-receipt.service";
import branchService, { Branch } from "@/service/branch.service";
import { useAuthContext } from "@/contexts/auth-context";
import { ROUTES } from "@/configs/routes.config";
import {
  BarcodeScanner,
  ProductSearch,
  ImportItemsTable,
  ImportSummary,
  ConfirmDialog,
  ImportItem,
} from "@/components/import-receipt";

export default function CreateImportReceiptPage() {
  const router = useRouter();
  const { user } = useAuthContext();
  const isAdmin = user?.role === "admin";

  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = React.useState<string>("");
  const [importItems, setImportItems] = React.useState<ImportItem[]>([]);
  const [supplierName, setSupplierName] = React.useState("");
  const [note, setNote] = React.useState("");
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

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

  const handleBarcodeScanned = React.useCallback(
    async (barcode: string) => {
      const existingItem = importItems.find((item) => item.barcode === barcode);

      if (existingItem) {
        setImportItems((prev) =>
          prev.map((item) =>
            item.barcode === barcode
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        );
        toast.success(`+1 ${existingItem.productName}`);
      } else {
        try {
          const response = await productService.getByBarcode(barcode);
          if (response.success && response.data) {
            const product = response.data;
            setImportItems((prev) => [
              ...prev,
              {
                productId: product._id,
                productName: product.name,
                barcode: product.barcode || barcode,
                quantity: 1,
                importPrice: 0,
                unit: product.unit,
                image: product.image,
              },
            ]);
            toast.success(`Đã thêm: ${product.name}`);
          } else {
            toast.error("Không tìm thấy sản phẩm");
          }
        } catch (error) {
          toast.error((error as Error).message || "Không tìm thấy sản phẩm");
        }
      }
    },
    [importItems]
  );

  const handleSearch = React.useCallback(async (term: string) => {
    const response = await productService.search({ name: term });
    return response.success && response.data ? response.data : [];
  }, []);

  const handleProductSelect = React.useCallback(
    (product: Product) => {
      const existingItem = importItems.find((item) => item.productId === product._id);

      if (existingItem) {
        setImportItems((prev) =>
          prev.map((item) =>
            item.productId === product._id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        );
        toast.success(`+1 ${product.name}`);
      } else {
        setImportItems((prev) => [
          ...prev,
          {
            productId: product._id,
            productName: product.name,
            barcode: product.barcode || "",
            quantity: 1,
            importPrice: 0,
            unit: product.unit,
            image: product.image,
          },
        ]);
        toast.success(`Đã thêm: ${product.name}`);
      }
    },
    [importItems]
  );

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      setImportItems((prev) => prev.filter((item) => item.productId !== productId));
      return;
    }
    setImportItems((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const updateImportPrice = (productId: string, newPrice: number) => {
    setImportItems((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, importPrice: newPrice } : item
      )
    );
  };

  const removeItem = (productId: string) => {
    setImportItems((prev) => prev.filter((item) => item.productId !== productId));
  };

  const clearItems = () => {
    setImportItems([]);
  };

  const validateItems = () => {
    const invalidItems = importItems.filter((item) => item.importPrice <= 0);
    if (invalidItems.length > 0) {
      toast.error(`Vui lòng nhập giá cho: ${invalidItems.map((i) => i.productName).join(", ")}`);
      return false;
    }
    return true;
  };

  const handleSubmitClick = () => {
    if (validateItems()) {
      setShowConfirmDialog(true);
    }
  };

  const handleSubmit = async () => {
    if (isAdmin && !selectedBranch) {
      toast.error("Vui lòng chọn chi nhánh");
      return;
    }

    setIsSubmitting(true);
    try {
      // Staff không cần gửi branchId - backend tự inject từ token
      // Admin bắt buộc phải gửi branchId
      const receiptData: CreateImportReceiptRequest = {
        ...(isAdmin && { branchId: selectedBranch }),
        listProduct: importItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          importPrice: item.importPrice,
        })),
        supplierName: supplierName || undefined,
        note: note || undefined,
      };

      const response = await importReceiptService.create(receiptData);

      if (response.success) {
        toast.success("Tạo phiếu nhập thành công!");
        router.push(ROUTES.IMPORTS);
      } else {
        toast.error(response.message || "Tạo phiếu nhập thất bại");
      }
    } catch (error) {
      toast.error((error as Error).message || "Lỗi tạo phiếu nhập");
    } finally {
      setIsSubmitting(false);
    }
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F9" && importItems.length > 0) {
        e.preventDefault();
        handleSubmitClick();
      }
      if (e.key === "Escape") {
        setShowConfirmDialog(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [importItems]);

  return (
    <div className="flex flex-col h-full p-4 pt-0">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="icon" onClick={() => router.push(ROUTES.IMPORTS)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Tạo phiếu nhập hàng</h1>
          <p className="text-sm text-muted-foreground">Quét barcode hoặc tìm kiếm sản phẩm để thêm vào phiếu</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left Panel */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Search Section */}
          <div className="bg-muted/50 rounded-lg p-4 mb-4 space-y-3">
            <BarcodeScanner onBarcodeScanned={handleBarcodeScanned} />
            <ProductSearch onProductSelect={handleProductSelect} searchFn={handleSearch} />
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

      <ConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        items={importItems}
        supplierName={supplierName}
        onConfirm={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
