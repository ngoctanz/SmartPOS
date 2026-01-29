/**
 * Print Queue Manager
 *
 * Hệ thống quản lý hàng đợi in ấn cho POS
 * - Queue-based: Đảm bảo thứ tự in, tránh race condition
 * - Job tracking: Mỗi print job có unique ID
 * - Mutex-like: Không cho 2 job in đồng thời
 * - Abort support: Có thể hủy job đang chờ
 *
 * @module print-queue
 */

// === Types ===

export type PrintJobStatus =
  | "pending" // Đang chờ trong queue
  | "printing" // Đang in
  | "completed" // Đã in xong
  | "cancelled" // Đã hủy
  | "error"; // Lỗi

export interface PrintJob {
  /** Unique ID của job (timestamp + random) */
  id: string;
  /** Mã hóa đơn liên kết */
  receiptCode: string;
  /** HTML content để in */
  html: string;
  /** Tiêu đề print dialog */
  title: string;
  /** Thời điểm tạo job */
  createdAt: number;
  /** Trạng thái hiện tại */
  status: PrintJobStatus;
  /** Callback khi hoàn thành */
  onComplete?: () => void;
  /** Callback khi lỗi */
  onError?: (error: Error) => void;
}

export interface PrintQueueState {
  /** Danh sách job trong queue */
  jobs: PrintJob[];
  /** Job đang in (nếu có) */
  currentJob: PrintJob | null;
  /** Queue có đang xử lý không */
  isProcessing: boolean;
  /** Số job đã hoàn thành trong session */
  completedCount: number;
}

// === Constants ===

const MAX_QUEUE_SIZE = 10; // Giới hạn queue để tránh memory leak
const JOB_TIMEOUT_MS = 30000; // Timeout 30s cho mỗi job
const CLEANUP_INTERVAL_MS = 60000; // Dọn dẹp job cũ mỗi 1 phút

// === Singleton State ===

let queueState: PrintQueueState = {
  jobs: [],
  currentJob: null,
  isProcessing: false,
  completedCount: 0,
};

// Event listeners
type QueueEventListener = (state: PrintQueueState) => void;
const listeners: Set<QueueEventListener> = new Set();

// === Helpers ===

/**
 * Generate unique job ID
 * Format: timestamp_randomHex
 */
function generateJobId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(16).slice(2, 10);
  return `${timestamp}_${random}`;
}

/**
 * Notify all listeners về state change
 */
function notifyListeners(): void {
  const stateCopy = { ...queueState };
  listeners.forEach((listener) => {
    try {
      listener(stateCopy);
    } catch (e) {
      console.error("[PrintQueue] Listener error:", e);
    }
  });
}

/**
 * Update state và notify
 */
function updateState(updates: Partial<PrintQueueState>): void {
  queueState = { ...queueState, ...updates };
  notifyListeners();
}

// === Hidden Iframe Management ===

let printIframe: HTMLIFrameElement | null = null;
let isIframeReady = false;

/**
 * Get or create the hidden print iframe
 * Singleton pattern để tái sử dụng iframe
 */
function getOrCreateIframe(): HTMLIFrameElement {
  if (typeof window === "undefined") {
    throw new Error("Print queue only works in browser");
  }

  if (!printIframe || !document.body.contains(printIframe)) {
    printIframe = document.createElement("iframe");
    printIframe.id = "smartpos-print-queue-iframe";
    printIframe.style.cssText =
      "position: fixed; right: 0; bottom: 0; width: 0; height: 0; border: 0; visibility: hidden; pointer-events: none;";
    document.body.appendChild(printIframe);
    isIframeReady = false;
  }

  return printIframe;
}

/**
 * Pre-warm iframe với base styles
 * Gọi khi app khởi động để giảm latency lần in đầu
 */
export function preWarmIframe(): boolean {
  if (typeof window === "undefined") return false;

  // Already warmed
  if (isIframeReady && printIframe && document.body.contains(printIframe)) {
    return true;
  }

  try {
    const iframe = getOrCreateIframe();
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return false;

    // Pre-load với empty content + base styles
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>SmartPOS Print</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; }
        </style>
      </head>
      <body></body>
      </html>
    `);
    doc.close();
    isIframeReady = true;

    console.log("[PrintQueue] Iframe pre-warmed successfully");
    return true;
  } catch (e) {
    console.warn("[PrintQueue] Failed to pre-warm iframe:", e);
    return false;
  }
}

// === Core Print Execution ===

/**
 * Execute print cho một job
 * Promise-based, resolve khi print dialog được mở
 */
function executePrintJob(job: PrintJob): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(
        new Error(`Print job ${job.id} timed out after ${JOB_TIMEOUT_MS}ms`),
      );
    }, JOB_TIMEOUT_MS);

    try {
      const iframe = getOrCreateIframe();
      const doc = iframe.contentDocument || iframe.contentWindow?.document;

      if (!doc) {
        clearTimeout(timeoutId);
        reject(new Error("Cannot access iframe document"));
        return;
      }

      // Validate job vẫn còn valid (chưa bị cancel)
      if (job.status === "cancelled") {
        clearTimeout(timeoutId);
        reject(new Error("Job was cancelled"));
        return;
      }

      // Write content to iframe
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${job.title}</title>
        </head>
        <body>${job.html}</body>
        </html>
      `);
      doc.close();

      // Wait for images to load (especially QR codes)
      const images = doc.getElementsByTagName("img");
      let loadedCount = 0;
      const totalImages = images.length;
      let hasPrinted = false;

      const triggerPrint = () => {
        if (hasPrinted) return;
        hasPrinted = true;
        clearTimeout(timeoutId);

        try {
          // Double-check job still valid
          if (job.status === "cancelled") {
            reject(new Error("Job was cancelled before print"));
            return;
          }

          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();

          // Resolve sau khi print dialog mở
          // Browser sẽ block ở đây cho đến khi user đóng dialog
          setTimeout(resolve, 100);
        } catch (e) {
          reject(e);
        }
      };

      if (totalImages > 0) {
        let allImagesLoaded = false;

        const onImageLoad = () => {
          loadedCount++;
          
          if (loadedCount >= totalImages && !allImagesLoaded) {
            allImagesLoaded = true;
            // Tất cả images đã load, trigger print NGAY với delay tối thiểu
            setTimeout(triggerPrint, 50);
          }
        };

        // Setup load handlers cho tất cả images
        for (let i = 0; i < images.length; i++) {
          const img = images[i];
          
          // Nếu image đã complete (cached hoặc base64 đã decode), count ngay
          if (img.complete && img.naturalWidth > 0) {
            onImageLoad();
          } else {
            // Chưa load, đợi event
            img.onload = onImageLoad;
            img.onerror = () => {
              console.warn(`[PrintQueue] Image ${i} failed to load`);
              onImageLoad(); // Count errors as loaded to not block
            };
          }
        }

        // Fallback timeout: Chỉ dùng khi image thực sự không load được
        // 1000ms (1s) cho chắc ăn với QR base64 (thường load trong 100-200ms)
        setTimeout(() => {
          if (!hasPrinted) {
            console.warn("[PrintQueue] Image load timeout (1s), forcing print");
            triggerPrint();
          }
        }, 1000);
      } else {
        // Không có images, trigger ngay
        setTimeout(triggerPrint, 30);
      }
    } catch (e) {
      clearTimeout(timeoutId);
      reject(e);
    }
  });
}

// === Queue Processing ===

/**
 * Process queue - lấy job tiếp theo và in
 * Chỉ 1 job được in tại 1 thời điểm (mutex-like)
 */
async function processQueue(): Promise<void> {
  // Đã đang xử lý thì return
  if (queueState.isProcessing) {
    console.log("[PrintQueue] Already processing, skipping...");
    return;
  }

  // Lấy job pending đầu tiên
  const pendingJob = queueState.jobs.find((j) => j.status === "pending");
  if (!pendingJob) {
    console.log("[PrintQueue] No pending jobs");
    return;
  }

  // Mark as processing
  updateState({
    isProcessing: true,
    currentJob: pendingJob,
    jobs: queueState.jobs.map((j) =>
      j.id === pendingJob.id
        ? { ...j, status: "printing" as PrintJobStatus }
        : j,
    ),
  });

  console.log(
    `[PrintQueue] Processing job ${pendingJob.id} for receipt ${pendingJob.receiptCode}`,
  );

  try {
    await executePrintJob(pendingJob);

    // Mark as completed
    updateState({
      isProcessing: false,
      currentJob: null,
      completedCount: queueState.completedCount + 1,
      jobs: queueState.jobs.map((j) =>
        j.id === pendingJob.id
          ? { ...j, status: "completed" as PrintJobStatus }
          : j,
      ),
    });

    console.log(`[PrintQueue] Job ${pendingJob.id} completed`);
    pendingJob.onComplete?.();
  } catch (error) {
    console.error(`[PrintQueue] Job ${pendingJob.id} failed:`, error);

    // Mark as error
    updateState({
      isProcessing: false,
      currentJob: null,
      jobs: queueState.jobs.map((j) =>
        j.id === pendingJob.id
          ? { ...j, status: "error" as PrintJobStatus }
          : j,
      ),
    });

    pendingJob.onError?.(error as Error);
  }

  // Tiếp tục xử lý job tiếp theo (nếu có)
  // Delay nhỏ để tránh blocking UI
  setTimeout(() => {
    const hasMorePending = queueState.jobs.some((j) => j.status === "pending");
    if (hasMorePending) {
      processQueue();
    }
  }, 100);
}

// === Public API ===

/**
 * Thêm job vào queue
 * @returns Job ID để track
 */
export function enqueueJob(params: {
  receiptCode: string;
  html: string;
  title?: string;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}): string {
  const { receiptCode, html, title = "Hóa đơn", onComplete, onError } = params;

  // Validate
  if (!receiptCode || !html) {
    throw new Error("receiptCode and html are required");
  }

  // Check queue size limit
  const pendingJobs = queueState.jobs.filter(
    (j) => j.status === "pending" || j.status === "printing",
  );
  if (pendingJobs.length >= MAX_QUEUE_SIZE) {
    throw new Error(`Print queue is full (max ${MAX_QUEUE_SIZE} jobs)`);
  }

  // Check duplicate (same receipt code in pending)
  const duplicateJob = pendingJobs.find((j) => j.receiptCode === receiptCode);
  if (duplicateJob) {
    console.warn(
      `[PrintQueue] Duplicate job for receipt ${receiptCode}, returning existing job ID`,
    );
    return duplicateJob.id;
  }

  // Create new job
  const job: PrintJob = {
    id: generateJobId(),
    receiptCode,
    html,
    title: `${title} - ${receiptCode}`,
    createdAt: Date.now(),
    status: "pending",
    onComplete,
    onError,
  };

  // Add to queue
  updateState({
    jobs: [...queueState.jobs, job],
  });

  console.log(`[PrintQueue] Job ${job.id} enqueued for receipt ${receiptCode}`);

  // Start processing if not already
  setTimeout(processQueue, 0);

  return job.id;
}

/**
 * Hủy job (nếu còn pending)
 */
export function cancelJob(jobId: string): boolean {
  const job = queueState.jobs.find((j) => j.id === jobId);

  if (!job) {
    console.warn(`[PrintQueue] Job ${jobId} not found`);
    return false;
  }

  if (job.status !== "pending") {
    console.warn(`[PrintQueue] Job ${jobId} is ${job.status}, cannot cancel`);
    return false;
  }

  updateState({
    jobs: queueState.jobs.map((j) =>
      j.id === jobId ? { ...j, status: "cancelled" as PrintJobStatus } : j,
    ),
  });

  console.log(`[PrintQueue] Job ${jobId} cancelled`);
  return true;
}

/**
 * Hủy tất cả job của một receipt code
 */
export function cancelJobsByReceiptCode(receiptCode: string): number {
  let cancelledCount = 0;

  updateState({
    jobs: queueState.jobs.map((j) => {
      if (j.receiptCode === receiptCode && j.status === "pending") {
        cancelledCount++;
        return { ...j, status: "cancelled" as PrintJobStatus };
      }
      return j;
    }),
  });

  if (cancelledCount > 0) {
    console.log(
      `[PrintQueue] Cancelled ${cancelledCount} jobs for receipt ${receiptCode}`,
    );
  }

  return cancelledCount;
}

/**
 * Lấy state hiện tại của queue
 */
export function getQueueState(): PrintQueueState {
  return { ...queueState };
}

/**
 * Lấy job by ID
 */
export function getJob(jobId: string): PrintJob | undefined {
  return queueState.jobs.find((j) => j.id === jobId);
}

/**
 * Subscribe to queue state changes
 */
export function subscribeToQueue(listener: QueueEventListener): () => void {
  listeners.add(listener);
  // Notify immediately with current state
  listener({ ...queueState });

  // Return unsubscribe function
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Dọn dẹp jobs cũ (completed/cancelled/error)
 * Giữ lại 50 job gần nhất để debug
 */
export function cleanupOldJobs(): number {
  const now = Date.now();
  const MAX_AGE_MS = 30 * 60 * 1000; // 30 phút
  const MAX_KEEP = 50;

  const activeJobs = queueState.jobs.filter(
    (j) => j.status === "pending" || j.status === "printing",
  );

  const finishedJobs = queueState.jobs
    .filter(
      (j) =>
        j.status === "completed" ||
        j.status === "cancelled" ||
        j.status === "error",
    )
    .filter((j) => now - j.createdAt < MAX_AGE_MS)
    .slice(-MAX_KEEP);

  const removedCount =
    queueState.jobs.length - activeJobs.length - finishedJobs.length;

  if (removedCount > 0) {
    updateState({
      jobs: [...activeJobs, ...finishedJobs],
    });
    console.log(`[PrintQueue] Cleaned up ${removedCount} old jobs`);
  }

  return removedCount;
}

/**
 * Reset queue (cho testing/debug)
 */
export function resetQueue(): void {
  updateState({
    jobs: [],
    currentJob: null,
    isProcessing: false,
    completedCount: 0,
  });
  console.log("[PrintQueue] Queue reset");
}

// === Auto Cleanup ===

let cleanupInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start auto cleanup interval
 */
export function startAutoCleanup(): void {
  if (cleanupInterval) return;

  cleanupInterval = setInterval(cleanupOldJobs, CLEANUP_INTERVAL_MS);
  console.log("[PrintQueue] Auto cleanup started");
}

/**
 * Stop auto cleanup interval
 */
export function stopAutoCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    console.log("[PrintQueue] Auto cleanup stopped");
  }
}

// === Debug ===

/**
 * Get debug info về queue
 */
export function getDebugInfo(): {
  queueSize: number;
  pendingCount: number;
  completedCount: number;
  isProcessing: boolean;
  currentJobId: string | null;
} {
  return {
    queueSize: queueState.jobs.length,
    pendingCount: queueState.jobs.filter((j) => j.status === "pending").length,
    completedCount: queueState.completedCount,
    isProcessing: queueState.isProcessing,
    currentJobId: queueState.currentJob?.id || null,
  };
}
