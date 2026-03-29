import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  if (process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true") return null;
  return <SignIn />;
}
