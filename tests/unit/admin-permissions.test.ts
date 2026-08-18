import { describe, expect, it } from "vitest";

import {
  allAdminPermissions,
  defaultAttendantPermissions,
  getAdminPermissions,
  getAdminRole,
  hasAdminPermission,
  normalizeAdminPermissions,
} from "@/lib/admin-permissions";

describe("perfis administrativos", () => {
  it("mantém contas antigas como administradoras", () => {
    expect(getAdminRole(undefined)).toBe("admin");
    expect(getAdminPermissions("admin", undefined)).toEqual(
      allAdminPermissions
    );
  });

  it("reconhece atendente e suas permissões padrão", () => {
    expect(getAdminRole({ label_role: "attendant" })).toBe(
      "attendant"
    );
    expect(defaultAttendantPermissions).toEqual([
      "orders",
      "customers",
      "deliveries",
    ]);
  });

  it("remove permissões inválidas e duplicadas", () => {
    expect(
      normalizeAdminPermissions([
        "orders",
        "orders",
        "billing",
        "root",
        123,
      ])
    ).toEqual(["orders", "billing"]);
  });

  it("não concede permissão ausente ao atendente", () => {
    const permissions = getAdminPermissions("attendant", {
      label_permissions: ["orders"],
    });

    expect(hasAdminPermission(permissions, "orders")).toBe(true);
    expect(hasAdminPermission(permissions, "settings")).toBe(false);
  });
});
