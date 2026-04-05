import type { Address } from './api';

const placeholderLine1Values = new Set(['default billing address', 'default shipping address']);

export function isPlaceholderAddress(
  address: Pick<Address, 'line1' | 'city' | 'state' | 'postalCode'> | null | undefined,
) {
  if (!address) {
    return false;
  }

  return (
    placeholderLine1Values.has(address.line1.trim().toLowerCase()) &&
    address.city.trim().toLowerCase() === 'unknown' &&
    address.state.trim().toLowerCase() === 'unknown' &&
    address.postalCode.trim() === '000000'
  );
}

export function getPrimaryAddress(addresses: Address[] | null | undefined) {
  const meaningfulAddresses = (addresses ?? []).filter((address) => !isPlaceholderAddress(address));
  return meaningfulAddresses.find((address) => address.isDefault) ?? meaningfulAddresses[0] ?? null;
}
