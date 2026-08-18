import { describe, expect, it } from "vitest";

import {
  getStoreOpenStatus,
  type StoreBusinessHour,
} from "@/lib/store-open-status";

function weeklySchedule(
  overrides: StoreBusinessHour[] = []
) {
  return Array.from({ length: 7 }, (_, weekday) => {
    return (
      overrides.find((hour) => hour.weekday === weekday) ?? {
        weekday,
        isOpen: false,
        opensAt: null,
        closesAt: null,
      }
    );
  });
}

const tuesday = {
  weekday: 2,
  isOpen: true,
  opensAt: "09:00",
  closesAt: "19:00",
};

describe("horário da loja em São Paulo", () => {
  it("abre exatamente no início e fecha exatamente no fim", () => {
    const schedule = weeklySchedule([tuesday]);

    expect(
      getStoreOpenStatus(
        schedule,
        new Date("2026-08-18T12:00:00.000Z")
      ).isOpen
    ).toBe(true);
    expect(
      getStoreOpenStatus(
        schedule,
        new Date("2026-08-18T22:00:00.000Z")
      ).isOpen
    ).toBe(false);
  });

  it("informa a abertura do mesmo dia antes do expediente", () => {
    const status = getStoreOpenStatus(
      weeklySchedule([tuesday]),
      new Date("2026-08-18T11:30:00.000Z")
    );

    expect(status).toEqual({
      isOpen: false,
      detail: "Abre hoje às 09:00",
    });
  });

  it("mantém aberto após a meia-noite quando o turno atravessa o dia", () => {
    const status = getStoreOpenStatus(
      weeklySchedule([
        {
          weekday: 5,
          isOpen: true,
          opensAt: "18:00",
          closesAt: "02:00",
        },
      ]),
      new Date("2026-08-22T04:00:00.000Z")
    );

    expect(status).toEqual({
      isOpen: true,
      detail: "Fecha hoje às 02:00",
    });
  });

  it("usa a mensagem de consulta quando não há horários válidos", () => {
    expect(
      getStoreOpenStatus(
        weeklySchedule(),
        new Date("2026-08-18T12:00:00.000Z")
      )
    ).toEqual({
      isOpen: false,
      detail: "Horários sob consulta",
    });
  });
});
