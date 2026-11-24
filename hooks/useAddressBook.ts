import { useAddressBookContext } from "@/contexts/AddressBookContext";

export function useAddressBook() {
  return useAddressBookContext();
}
