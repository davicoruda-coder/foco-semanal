import { redirect } from "next/navigation";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function Home() {
  const reqHeaders = await headers();
  const ua = reqHeaders.get("user-agent") || "";
  const chMobile = reqHeaders.get("sec-ch-ua-mobile");
  const isMobile =
    chMobile === "?1" ||
    /mobile|iphone|android|ipod|blackberry|opera mini|iemobile/i.test(ua);

  if (isMobile) {
    redirect("/agenda");
  } else {
    redirect("/hoje");
  }
}
