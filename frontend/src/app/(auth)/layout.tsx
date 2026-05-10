import Image from "next/image";
import logo from "@/logo.png";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <Image src={logo} alt="Integris" height={36} className="mb-6 h-9 w-auto" />
        {children}
      </div>
    </div>
  );
}
