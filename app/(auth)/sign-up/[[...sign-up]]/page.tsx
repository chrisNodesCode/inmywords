import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  if (process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true") return null;
  return <SignUp forceRedirectUrl="/select-plan" />;
}
