import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import ProductSortableList from "../../components/admin/ProductSortableList";

// Mock dnd-kit context
vi.mock("@dnd-kit/core", () => {
  return {
    DndContext: ({ children }: React.PropsWithChildren) => <div data-testid="dnd-context">{children}</div>,
    closestCenter: vi.fn(),
    KeyboardSensor: vi.fn(),
    MouseSensor: vi.fn(),
    TouchSensor: vi.fn(),
    PointerSensor: vi.fn(),
    useSensor: vi.fn(),
    useSensors: vi.fn(() => []),
  };
});

vi.mock("@dnd-kit/sortable", () => {
  return {
    SortableContext: ({ children }: React.PropsWithChildren) => <div data-testid="sortable-context">{children}</div>,
    arrayMove: vi.fn((arr: unknown[], oldI: number, newI: number) => {
      const copy = [...arr];
      const item = copy.splice(oldI, 1)[0];
      copy.splice(newI, 0, item);
      return copy;
    }),
    sortableKeyboardCoordinates: vi.fn(),
    verticalListSortingStrategy: vi.fn(),
  };
});

describe("ProductSortableList", () => {
  it("renders correctly with given products", () => {
    const products = [
      { id: "1", name: "Product A" },
      { id: "2", name: "Product B" },
    ];

    const reorderMock = vi.fn();

    const html = renderToStaticMarkup(
      <ProductSortableList
        categoryId="cat-1"
        initialProductIds={products.map((p) => p.id)}
        reorderAction={reorderMock}
      >
        {products.map((product) => (
          <div key={product.id} id={product.id} data-testid={`item-${product.id}`}>
            {String(product.name)}
          </div>
        ))}
      </ProductSortableList>
    );

    expect(html).toContain("Product A");
    expect(html).toContain("Product B");
    expect(html).toContain("data-testid=\"dnd-context\"");
    expect(html).toContain("data-testid=\"sortable-context\"");
  });
});
