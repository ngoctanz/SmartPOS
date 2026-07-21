import { PayOS } from "@payos/node";

// Cache PayOS clients per branch to avoid creating new instances
const payosClients = new Map();

/**
 * Get PayOS client for a specific branch
 * If branchCredentials not provided, fallback to env variables (backward compatibility)
 */
const getPayOSClient = (branchCredentials = null) => {
  // If branch credentials provided, use branch-specific client
  if (
    branchCredentials?.PAYOS_CLIENT_ID &&
    branchCredentials?.PAYOS_API_KEY &&
    branchCredentials?.PAYOS_CHECKSUM_KEY
  ) {
    const cacheKey = branchCredentials.PAYOS_CLIENT_ID;

    if (!payosClients.has(cacheKey)) {
      payosClients.set(
        cacheKey,
        new PayOS({
          clientId: branchCredentials.PAYOS_CLIENT_ID,
          apiKey: branchCredentials.PAYOS_API_KEY,
          checksumKey: branchCredentials.PAYOS_CHECKSUM_KEY,
        })
      );
    }

    return payosClients.get(cacheKey);
  }

  // Fallback to global env variables (for backward compatibility)
  if (!payosClients.has("default")) {
    if (
      !process.env.PAYOS_CLIENT_ID ||
      !process.env.PAYOS_API_KEY ||
      !process.env.PAYOS_CHECKSUM_KEY
    ) {
      throw new Error(
        "PayOS credentials not configured. Please set PAYOS_CLIENT_ID, PAYOS_API_KEY, and PAYOS_CHECKSUM_KEY environment variables or provide branch credentials."
      );
    }
    payosClients.set(
      "default",
      new PayOS({
        clientId: process.env.PAYOS_CLIENT_ID,
        apiKey: process.env.PAYOS_API_KEY,
        checksumKey: process.env.PAYOS_CHECKSUM_KEY,
      })
    );
  }

  return payosClients.get("default");
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
   * @param {Object} params - Payment parameters
   * @param {Object} branchCredentials - Branch-specific PayOS credentials (optional)
   */
  async createPaymentLink(params, branchCredentials = null) {
    const { orderCode, amount, description, returnUrl, cancelUrl, expiredAt } = params;
    // Tạm thời tắt PayOS, trả về data mock
    return {
      success: true,
      data: {
        paymentLinkId: "dummy_link",
        checkoutUrl: "",
        qrCode: "",
        accountNumber: "",
        accountName: "",
        bin: "",
        amount,
        description,
      },
    };
  },

  /**
   * Cancel PayOS payment link
   * @param {Object} branchCredentials - Branch-specific PayOS credentials (optional)
   */
  async cancelPaymentLink(
    orderCode,
    reason = "User cancelled",
    branchCredentials = null
  ) {
    try {
      const client = getPayOSClient(branchCredentials);
      await client.paymentRequests.cancel(orderCode, reason);
      return { success: true };
    } catch (error) {
      console.error("PayOS cancelPaymentLink error:", error);
      throw new Error("Không thể hủy giao dịch");
    }
  },

  /**
   * Get PayOS payment info
   * @param {Object} branchCredentials - Branch-specific PayOS credentials (optional)
   */
  async getPaymentInfo(orderCode, branchCredentials = null) {
    try {
      const client = getPayOSClient(branchCredentials);
      return await client.paymentRequests.get(orderCode);
    } catch (error) {
      console.error("PayOS getPaymentInfo error:", error);
      throw error;
    }
  },

  /**
   * Verify PayOS webhook using v2 SDK
   * @param {Object} branchCredentials - Branch-specific PayOS credentials (optional)
   */
  async verifyWebhook(webhookData, branchCredentials = null) {
    try {
      const client = getPayOSClient(branchCredentials);
      return await client.webhooks.verify(webhookData);
    } catch (error) {
      console.error("Verify webhook error:", error);
      return null;
    }
  },

  /**
   * Confirm webhook URL with PayOS
   * @param {Object} branchCredentials - Branch-specific PayOS credentials (optional)
   */
  async confirmWebhookUrl(webhookUrl, branchCredentials = null) {
    try {
      const client = getPayOSClient(branchCredentials);
      return await client.webhooks.confirm(webhookUrl);
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
   * @param {Object} branchCredentials - Branch-specific PayOS credentials (optional)
   */
  async verifyPaymentWebhookData(webhookData, branchCredentials = null) {
    try {
      return await this.verifyWebhook(webhookData, branchCredentials);
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
