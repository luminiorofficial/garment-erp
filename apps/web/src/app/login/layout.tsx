import { GuestGate } from "@/components/layout/auth-gate";

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <GuestGate>{children}</GuestGate>;
}
