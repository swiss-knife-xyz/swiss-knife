import TracerPage from "./TracerPage";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense>
      <TracerPage />
    </Suspense>
  );
}
