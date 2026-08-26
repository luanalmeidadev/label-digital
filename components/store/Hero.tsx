import { Clock3, MapPin } from "lucide-react";

import { getPublicInstallationProfile } from "@/config/installation/public";
import type { PublicBusinessHour } from "@/lib/public-store-settings";
import StoreOpenStatus from "@/components/store/StoreOpenStatus";

const installation = getPublicInstallationProfile();
const publicContent = installation.publicContent;

type HeroProps = {
  storeName: string;
  businessHours: PublicBusinessHour[];
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
};

const weekdayLabels = [
  "domingo",
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sábado",
];

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatBusinessHours(hours: PublicBusinessHour[]) {
  const openHours = hours
    .filter(
      (hour) => hour.isOpen && hour.opensAt && hour.closesAt
    )
    .sort(
      (a, b) =>
        (a.weekday === 0 ? 7 : a.weekday) -
        (b.weekday === 0 ? 7 : b.weekday)
    );

  if (openHours.length === 0) {
    return ["Horários sob consulta"];
  }

  const groups: Array<{
    start: number;
    end: number;
    opensAt: string;
    closesAt: string;
  }> = [];

  for (const hour of openHours) {
    const previous = groups.at(-1);
    const normalizedDay = hour.weekday === 0 ? 7 : hour.weekday;

    if (
      previous &&
      normalizedDay === previous.end + 1 &&
      hour.opensAt === previous.opensAt &&
      hour.closesAt === previous.closesAt
    ) {
      previous.end = normalizedDay;
      continue;
    }

    groups.push({
      start: normalizedDay,
      end: normalizedDay,
      opensAt: hour.opensAt!,
      closesAt: hour.closesAt!,
    });
  }

  return groups.map((group) => {
    const startIndex = group.start === 7 ? 0 : group.start;
    const endIndex = group.end === 7 ? 0 : group.end;
    const days =
      group.start === group.end
        ? capitalize(weekdayLabels[startIndex])
        : `${capitalize(weekdayLabels[startIndex])} a ${weekdayLabels[endIndex]}`;

    return `${days}: ${group.opensAt} às ${group.closesAt}`;
  });
}

function getFulfillmentCopy(
  pickupEnabled: boolean,
  deliveryEnabled: boolean
) {
  if (pickupEnabled && deliveryEnabled) {
    return publicContent.fulfillment.pickupAndDelivery;
  }

  if (pickupEnabled) {
    return publicContent.fulfillment.pickupOnly;
  }

  if (deliveryEnabled) {
    return publicContent.fulfillment.deliveryOnly;
  }

  return publicContent.fulfillment.unavailable;
}

export default function Hero({
  storeName,
  businessHours,
  pickupEnabled,
  deliveryEnabled,
}: HeroProps) {
  const hoursLines = formatBusinessHours(businessHours);
  const fulfillmentCopy = getFulfillmentCopy(
    pickupEnabled,
    deliveryEnabled
  );

  return (
    <section className="bg-brand-primary pb-10">
      <div className="mx-auto max-w-6xl px-5">
        <div className="max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-secondary">
            {storeName}
          </p>

          <h1 className="mt-2 text-3xl font-bold leading-tight text-white sm:text-4xl">
            {publicContent.hero.title}
          </h1>

          <p className="mt-4 max-w-md text-sm leading-6 text-white/75 sm:text-base">
            {publicContent.hero.description}
          </p>
        </div>

        <div className="mt-7">
          <StoreOpenStatus businessHours={businessHours} />
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-2xl bg-white/10 p-4 text-white">
            <Clock3 size={20} className="mt-0.5 shrink-0 text-brand-secondary" />

            <div>
              <p className="text-sm font-bold">Horário de atendimento</p>
              <p className="mt-1 text-xs leading-5 text-white/70">
                {hoursLines.map((line, index) => (
                  <span key={line}>
                    {index > 0 && <br />}
                    {line}
                  </span>
                ))}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl bg-white/10 p-4 text-white">
            <MapPin size={20} className="mt-0.5 shrink-0 text-brand-secondary" />

            <div>
              <p className="text-sm font-bold">{fulfillmentCopy.title}</p>
              <p className="mt-1 text-xs leading-5 text-white/70">
                {fulfillmentCopy.description}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
