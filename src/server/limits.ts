/**
 * The largest backup, in bytes, that a restore accepts. The library refuses
 * any change that would grow its backup past this, so every export restores.
 */
export const BACKUP_SIZE_LIMIT = 16 * 1024 * 1024
