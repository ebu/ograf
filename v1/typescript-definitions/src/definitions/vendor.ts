/**
 * Vendors MUST use the prefix "v_" in any additional properties to ensure forward compatibility. For example "v_SuperFlyFluxCapacitorStatus".
 */
export type VendorSpecific = `v_${VendorName}${string}`;
type VendorName = string;
