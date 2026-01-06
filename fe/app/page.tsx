import { ROUTES } from "@/configs/routes.config";
import { redirect } from "next/navigation";
export default function Home() {
  redirect(ROUTES.LOGIN);
}
