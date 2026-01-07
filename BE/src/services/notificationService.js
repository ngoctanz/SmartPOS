/**
 * Notification Service using Server-Sent Events (SSE)
 * Broadcasts payment notifications to connected clients
 */

const clients = new Map(); // Map of connected SSE clients: branchId -> Set of response objects

/**
 * Add a new SSE client connection
 */
export const addClient = (branchId, res) => {
  if (!clients.has(branchId)) {
    clients.set(branchId, new Set());
  }
  clients.get(branchId).add(res);

  console.log(
    `[SSE] Client connected for branch: ${branchId}, Total: ${
      clients.get(branchId).size
    }`
  );
};

/**
 * Remove SSE client connection
 */
export const removeClient = (branchId, res) => {
  if (clients.has(branchId)) {
    clients.get(branchId).delete(res);
    if (clients.get(branchId).size === 0) {
      clients.delete(branchId);
    }
    console.log(`[SSE] Client disconnected from branch: ${branchId}`);
  }
};

/**
 * Broadcast payment success notification to all clients of a branch
 */
export const broadcastPaymentSuccess = (branchId, paymentData) => {
  const notification = {
    type: "PAYMENT_SUCCESS",
    data: {
      receiptCode: paymentData.receiptCode,
      amount: paymentData.amount,
      timestamp: new Date().toISOString(),
    },
  };

  console.log(
    `[SSE] Broadcasting payment success for branch ${branchId}:`,
    notification
  );

  if (clients.has(branchId)) {
    const branchClients = clients.get(branchId);
    const deadClients = new Set();

    branchClients.forEach((client) => {
      try {
        client.write(`data: ${JSON.stringify(notification)}\n\n`);
      } catch (error) {
        console.error(`[SSE] Failed to send to client:`, error);
        deadClients.add(client);
      }
    });

    // Clean up dead connections
    deadClients.forEach((client) => {
      branchClients.delete(client);
    });
  }
};

/**
 * Get total connected clients count
 */
export const getConnectedClientsCount = () => {
  let total = 0;
  clients.forEach((branchClients) => {
    total += branchClients.size;
  });
  return total;
};

export const notificationService = {
  addClient,
  removeClient,
  broadcastPaymentSuccess,
  getConnectedClientsCount,
};
