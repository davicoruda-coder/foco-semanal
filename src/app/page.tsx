import { redirect } from "next/navigation";
import { headers } from "next/headers";

export default async function Home() {
  const reqHeaders = await headers();
  const ua = reqHeaders.get("user-agent") || "";
  const isMobile = /mobile|iphone|android|ipod|blackberry|opera mini|iemobile/i.test(
    ua,
  );

  if (isMobile) {
    redirect("/agenda");
  } else {
    redirect("/hoje");
  }
}
