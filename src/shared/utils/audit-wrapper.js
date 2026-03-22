export function withAudit(fn, auditService, config) {
  return async function (params) {
    const context = {};

    try {
      const result = await fn(params, context);

      await auditService.log({
        userId: config.getUserId?.(result, params, context),
        action: config.action,
        entityType: config.entityType,
        entityId: config.getEntityId?.(result, params, context),
        metadata: config.getMetadata?.(params),
      });

      return result;

    } catch (error) {
      await auditService.log({
        userId: config.getUserId?.(null, params, context),
        action: config.action + '_FAILED',
        entityType: config.entityType,
        entityId: null,
        metadata: {
          ...config.getMetadata?.(params),
          error: error.message
        },
      });

      throw error;
    }
  };
}