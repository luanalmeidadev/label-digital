import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { getPublicInstallationProfile } from "@/config/installation/public";

const content =
  getPublicInstallationProfile().publicContent.preorders.banner;

export default function PreorderBanner() {
  return (
    <section className="pb-8">
      <div className="rounded-3xl bg-[#D2B48C] p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B0000]">
          {content.eyebrow}
        </p>

        <h2 className="mt-2 max-w-lg text-2xl font-bold text-[#8B0000] sm:text-3xl">
          {content.title}
        </h2>

        <p className="mt-3 max-w-xl text-sm leading-6 text-[#49352C]">
          {content.description}
        </p>

        <Link
          href="/encomendas"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#8B0000] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#700000]"
        >
          {content.ctaLabel}
          <ChevronRight size={18} />
        </Link>
      </div>
    </section>
  );
}
