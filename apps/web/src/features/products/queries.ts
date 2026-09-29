import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateProductInput, UpdateProductInput } from "@garment-erp/validation";
import type { ListParams } from "@/lib/types";
import { createProduct, getProduct, listProducts, updateProduct } from "./api";

export const productKeys = {
  all: ["products"] as const,
  lists: () => [...productKeys.all, "list"] as const,
  list: (params: ListParams) => [...productKeys.lists(), params] as const,
  detail: (id: string) => [...productKeys.all, "detail", id] as const,
  lookup: () => [...productKeys.all, "lookup"] as const,
};

export function useProducts(params: ListParams) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: () => listProducts(params),
    placeholderData: keepPreviousData,
  });
}

export function useProduct(id: string) {
  return useQuery({ queryKey: productKeys.detail(id), queryFn: () => getProduct(id) });
}

// Largest page the API allows (paginationQuerySchema).
const LOOKUP_PAGE_SIZE = 200;

/** All products (active and inactive) for selectors and for labelling styles. */
export function useProductLookup(enabled: boolean) {
  return useQuery({
    queryKey: productKeys.lookup(),
    queryFn: () => listProducts({ page: 1, pageSize: LOOKUP_PAGE_SIZE }),
    select: (data) => data.items,
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProductInput) => createProduct(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productKeys.all }),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductInput }) =>
      updateProduct(id, data),
    onSuccess: (product) => {
      queryClient.setQueryData(productKeys.detail(product.id), product);
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: productKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: productKeys.lookup() }),
      ]);
    },
  });
}
