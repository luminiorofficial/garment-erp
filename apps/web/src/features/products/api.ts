import type { CreateProductInput, UpdateProductInput } from "@garment-erp/validation";
import { apiFetch, buildQuery, jsonBody } from "@/lib/api";
import type { ListParams, Paginated } from "@/lib/types";
import type { Product } from "./types";

export function listProducts(params: ListParams) {
  return apiFetch<Paginated<Product>>(`/api/products${buildQuery({ ...params })}`);
}

export function getProduct(id: string) {
  return apiFetch<Product>(`/api/products/${id}`);
}

export function createProduct(input: CreateProductInput) {
  return apiFetch<Product>("/api/products", { method: "POST", ...jsonBody(input) });
}

export function updateProduct(id: string, input: UpdateProductInput) {
  return apiFetch<Product>(`/api/products/${id}`, { method: "PATCH", ...jsonBody(input) });
}
