import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { PayOS } = require("@payos/node");
import crypto from "crypto";

// Initialize PayOS client
const payos = new PayOS(
  process.env.PAYOS_CLIENT_ID,
  process.env.PAYOS_API_KEY,
  process.env.PAYOS_CHECKSUM_KEY
);

/**
 * PayOS Service
 * Handles online payment via PayOS payment gateway
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
   * Create PayOS payment link
   */
  async createPaymentLink(params) {
    const { orderCode, amount, description, returnUrl, cancelUrl, expiredAt } =
      params;

    try {
      const paymentLink = await payos.createPaymentLink({
        orderCode,
        amount,
        description,
        returnUrl,
        cancelUrl,
        expiredAt: expiredAt
          ? Math.floor(expiredAt.getTime() / 1000)
          : undefined,
      });

      return {
        success: true,
        data: {
          paymentLinkId: paymentLink.paymentLinkId,
          checkoutUrl: paymentLink.checkoutUrl,
          qrCode: paymentLink.qrCode,
          accountNumber: paymentLink.accountNumber,
          accountName: paymentLink.accountName,
          bin: paymentLink.bin,
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
      await payos.cancelPaymentLink(orderCode, reason);
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
      return await payos.getPaymentLinkInformation(orderCode);
    } catch (error) {
      console.error("PayOS getPaymentInfo error:", error);
      throw error;
    }
  },

  /**
   * Verify PayOS webhook signature
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
   * Verify webhook data using PayOS SDK
   */
  verifyPaymentWebhookData(webhookData) {
    try {
      return payos.verifyPaymentWebhookData(webhookData);
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
