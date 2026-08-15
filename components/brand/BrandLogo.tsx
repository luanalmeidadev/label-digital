import Image from "next/image";

import { cn } from "@/lib/utils";

const logoSizes = {
  header:
    "h-auto w-[160px] sm:w-[190px]",
  sidebar: "h-auto w-[185px]",
  mobile: "h-auto w-[145px]",
  drawer: "h-auto w-[165px]",
  footer:
    "h-auto w-[155px] sm:w-[175px]",
  order: "h-auto w-[165px]",
} as const;

export default function BrandLogo({
  variant = "header",
  eager = false,
  className,
}: {
  variant?: keyof typeof logoSizes;
  eager?: boolean;
  className?: string;
}) {
  return (
    <Image
      src="/brand/logo-creme.svg"
      alt="La'Bel Confeitaria"
      width={260}
      height={100}
      loading={eager ? "eager" : "lazy"}
      className={cn(logoSizes[variant], className)}
    />
  );
}
