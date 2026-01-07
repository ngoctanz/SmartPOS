/**
 * Test script to simulate PayOS webhook for payment success
 * Usage: node test-webhook.js <receiptCode>
 */

const receiptCode = process.argv[2] || "HD-20260108-0001";
const baseUrl = process.env.API_URL || "http://localhost:8081";

const webhookData = {
  code: "00",
  success: true,
  data: {
    orderCode: parseInt(receiptCode.split("-").join("")), // Convert HD-20260108-0001 to number
    amount: 100000,
    description: `Thanh toan don hang ${receiptCode}`,
    accountNumber: "0123456789",
    reference: receiptCode,
    transactionDateTime: new Date().toISOString(),
    status: "PAID",
  },
  signature: "test-signature",
};

console.log("Sending webhook to:", `${baseUrl}/v1/receipt/webhook/payos`);
console.log("Payload:", JSON.stringify(webhookData, null, 2));

fetch(`${baseUrl}/v1/receipt/webhook/payos`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(webhookData),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("\n✅ Webhook response:", data);
  })
  .catch((error) => {
    console.error("\n❌ Webhook error:", error.message);
  });
