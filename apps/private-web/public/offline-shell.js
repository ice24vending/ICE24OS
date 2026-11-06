/* Minimal read-only shell, gated by NEXT_PUBLIC_ICE24_OFFLINE_SHELL. P7 supplies authorized packages. */
async function showDownloadedOrder() {
  const status = document.getElementById("status");
  let database;
  try {
    const owner = JSON.parse(sessionStorage.getItem("ice24-offline-scope") || "null");
    if (
      !owner?.accountId ||
      !owner?.userId ||
      !Number.isFinite(owner.expiresAt) ||
      owner.expiresAt <= Date.now()
    )
      throw new Error("Reconecta para verificar tu sesión antes de consultar esta orden.");
    const id = /^\/maintenance\/work-orders\/([0-9a-f-]{36})/.exec(location.pathname)?.[1];
    if (!id) throw new Error("Abre una orden descargada desde su enlace.");
    const request = indexedDB.open("ice24-private");
    database = await new Promise((resolve, reject) => {
      request.onupgradeneeded = () => {
        request.transaction.abort();
        reject(new Error("No hay órdenes descargadas."));
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error("No fue posible acceder al almacenamiento local."));
    });
    const scope = JSON.stringify([owner.accountId, owner.userId]);
    const key = JSON.stringify([owner.accountId, owner.userId, id]);
    const read = (table, value) =>
      new Promise((resolve, reject) => {
        const query = database.transaction(table).objectStore(table).get(value);
        query.onsuccess = () => resolve(query.result);
        query.onerror = () => reject(query.error);
      });
    const [record, localKey] = await Promise.all([read("orders", key), read("keys", scope)]);
    if (!record || !localKey)
      throw new Error("Esta orden no está descargada para tu usuario y cuenta.");
    if (
      record.scope !== scope ||
      record.accountId !== owner.accountId ||
      record.userId !== owner.userId ||
      !Number.isFinite(record.expiresAt) ||
      record.expiresAt <= Date.now()
    )
      throw new Error("La descarga venció. Reconecta antes de continuar.");
    const additionalData = new TextEncoder().encode(
      JSON.stringify([
        "orders",
        record.key,
        record.scope,
        record.orderId,
        record.packageVersion,
        record.downloadedAt,
        record.expiresAt,
      ]),
    );
    const bytes = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: record.iv, additionalData },
      localKey.value,
      record.ciphertext,
    );
    const packet = JSON.parse(new TextDecoder().decode(bytes));
    const order = packet.order ?? packet;
    if (
      order.id !== id ||
      typeof order.folio !== "string" ||
      !Array.isArray(order.definition?.checklist)
    )
      throw new Error("El paquete descargado no es válido. Reconecta para recuperarlo.");
    const heading = document.createElement("h2");
    heading.textContent = `${order.folio} · ${order.machineCode}`;
    const procedure = document.createElement("p");
    procedure.textContent = order.definition.procedure || "Consulta el checklist de la orden.";
    const list = document.createElement("ul");
    for (const step of order.definition.checklist) {
      const item = document.createElement("li");
      item.textContent = step.label;
      list.append(item);
    }
    document.getElementById("order").append(heading, procedure, list);
    status.textContent = "Disponible sin conexión · Consulta de la versión descargada";
  } catch (error) {
    status.textContent =
      error instanceof Error && error.name !== "OperationError"
        ? error.message
        : "Los datos locales no pudieron verificarse. Reconecta; no se han sobrescrito.";
  } finally {
    database?.close();
  }
}
void showDownloadedOrder();
