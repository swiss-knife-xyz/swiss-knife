import { useRouter } from "@bprogress/next";

export const useTopLoaderRouter = () => {
  return {
    ...useRouter(),
  };
};
