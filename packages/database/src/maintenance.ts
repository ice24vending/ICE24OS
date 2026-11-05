/** F7 read contract owned by the database package; never expose the mutable equipment tables. */
export const MAINTENANCE_READ_VIEW = "maintenance.scheduled_activity_read";
/** F7-03 equipment-owned contracts. Commands may only change assignee/status, never definitions. */
export const WORK_ORDER_ACTIVITY_COMMAND = "maintenance.work_order_activity_command";
export const WORK_ORDER_MACHINE_READ = "maintenance.work_order_machine_read";
