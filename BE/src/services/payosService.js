import { PayOS } from "@payos/node";

// Lazy initialize PayOS client to avoid blocking route registration
let payos = null;

const getPayOSClient = () => {
  if (!payos) {
    if (
      !process.env.PAYOS_CLIENT_ID ||
      !process.env.PAYOS_API_KEY ||
      !process.env.PAYOS_CHECKSUM_KEY
    ) {
      throw new Error(
        "PayOS credentials not configured. Please set PAYOS_CLIENT_ID, PAYOS_API_KEY, and PAYOS_CHECKSUM_KEY environment variables."
      );
    }
    payos = new PayOS({
      clientId: process.env.PAYOS_CLIENT_ID,
      apiKey: process.env.PAYOS_API_KEY,
      checksumKey: process.env.PAYOS_CHECKSUM_KEY,
    });
  }
  return payos;
};

/**
 * PayOS Service
 * Handles online payment via PayOS payment gateway
 * Updated for @payos/node v2.0.4+
 */
export const payosService = {
  /**
   * Generate unique order code for PayOS
   */
  generateOrderCode() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return parseInt(`${timestamp % 1000000000}${random}`.slice(0, 13), 10);
  },

  /**
   * Create PayOS payment link using v2 API
   */
  async createPaymentLink(params) {
    const { orderCode, amount, description, returnUrl, cancelUrl, expiredAt } =
      params;

    try {
      // Use paymentRequests.create() in v2
      const paymentLink = await getPayOSClient().paymentRequests.create({
        orderCode,
        amount,
        description,
        returnUrl,
        cancelUrl,
        expiredAt: expiredAt
          ? Math.floor(expiredAt.getTime() / 1000)
          : undefined,
      });

      // Log để debug response structure
      console.log("PayOS Response:", JSON.stringify(paymentLink, null, 2));

      // Extract bank info from PayOS response
      const bin = paymentLink.bin || "";
      const accountNumber = paymentLink.accountNumber || "";
      const accountName = paymentLink.accountName || "";

      // Generate VietQR URL for direct bank app scanning
      // This QR can be scanned directly by any Vietnamese bank app
      let qrCodeUrl = "";

      if (bin && accountNumber) {
        // VietQR format: https://img.vietqr.io/image/{BIN}-{ACCOUNT_NUMBER}-{TEMPLATE}.png?amount={AMOUNT}&addInfo={DESCRIPTION}&accountName={NAME}
        qrCodeUrl = `https://img.vietqr.io/image/${bin}-${accountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(
          description
        )}&accountName=${encodeURIComponent(accountName)}`;
      }

      return {
        success: true,
        data: {
          paymentLinkId: paymentLink.paymentLinkId,
          checkoutUrl: paymentLink.checkoutUrl,
          qrCode: qrCodeUrl,
          // Save these to regenerate QR later
          accountNumber,
          accountName,
          bin,
          amount,
          description,
        },
      };
    } catch (error) {
      console.error("PayOS createPaymentLink error:", error);
      throw new Error(error.message || "Không thể tạo link thanh toán");
    }
  },

  /**
   * Cancel PayOS payment link
   */
  async cancelPaymentLink(orderCode, reason = "User cancelled") {
    try {
      await getPayOSClient().paymentRequests.cancel(orderCode, reason);
      return { success: true };
    } catch (error) {
      console.error("PayOS cancelPaymentLink error:", error);
      throw new Error("Không thể hủy giao dịch");
    }
  },

  /**
   * Get PayOS payment info
   */
  async getPaymentInfo(orderCode) {
    try {
      return await getPayOSClient().paymentRequests.get(orderCode);
    } catch (error) {
      console.error("PayOS getPaymentInfo error:", error);
      throw error;
    }
  },

  /**
   * Verify PayOS webhook using v2 SDK
   */
  async verifyWebhook(webhookData) {
    try {
      return await getPayOSClient().webhooks.verify(webhookData);
    } catch (error) {
      console.error("Verify webhook error:", error);
      return null;
    }
  },

  /**
   * Confirm webhook URL with PayOS
   */
  async confirmWebhookUrl(webhookUrl) {
    try {
      return await getPayOSClient().webhooks.confirm(webhookUrl);
    } catch (error) {
      console.error("Confirm webhook URL error:", error);
      throw error;
    }
  },

  /**
   * Legacy: Verify PayOS webhook signature (manual verification)
   * @deprecated Use verifyWebhook() instead
   */
  verifyWebhookSignature(data, signature) {
    try {
      const sortedData = Object.keys(data)
        .sort()
        .reduce((obj, key) => {
          obj[key] = data[key];
          return obj;
        }, {});

      const queryStr = Object.keys(sortedData)
        .filter((key) => sortedData[key] !== undefined)
        .map((key) => `${key}=${sortedData[key] ?? ""}`)
        .join("&");

      const expectedSignature = crypto
        .createHmac("sha256", process.env.PAYOS_CHECKSUM_KEY)
        .update(queryStr)
        .digest("hex");

      return expectedSignature === signature;
    } catch (error) {
      console.error("Verify signature error:", error);
      return false;
    }
  },

  /**
   * @deprecated Use verifyWebhook() method instead for v2 SDK
   */
  async verifyPaymentWebhookData(webhookData) {
    try {
      return await getPayOSClient().webhooks.verify(webhookData);
    } catch (error) {
      console.error("Verify webhook data error:", error);
      return null;
    }
  },

  /**
   * Parse webhook data from PayOS
   */
  parseWebhook(webhookData) {
    const { code, success, data, signature } = webhookData;
    return {
      code,
      success,
      signature,
      orderCode: data?.orderCode,
      amount: data?.amount,
      reference: data?.reference,
      transactionDateTime: data?.transactionDateTime,
      rawData: data,
    };
  },
};
