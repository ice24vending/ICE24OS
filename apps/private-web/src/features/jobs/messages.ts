/** Safe, user-facing messages for upstream job-center responses (no upstream text is echoed). */
export const upstreamMessage = (status: number): string =>
  status === 403
    ? "No tienes permiso o falta verificar MFA para el centro de trabajos."
    : status === 401
      ? "Tu sesión expiró. Inicia sesión nuevamente."
      : status === 404
        ? "El trabajo ya no está disponible."
        : status === 409
          ? "El trabajo ya no está en un estado que permita reintentarlo. Actualiza la vista."
          : "No fue posible consultar el centro de trabajos. Intenta nuevamente.";
