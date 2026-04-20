import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Brand = { logoUrl: string | null; companyName: string };

let cached: Brand | null = null;
let inflight: Promise<Brand> | null = null;
const listeners = new Set<(b: Brand) => void>();

async function fetchBrand(): Promise<Brand> {
  if (cached) return cached;
  if (inflight) return inflight;
  inflight = (async () => {
  const { data } = await supabase.from("settings").select("company_name").limit(1).maybeSingle();
  const brand: Brand = {
    logoUrl: null,
    companyName: data?.company_name ?? "FIRE",
  };
  cached = brand;
  listeners.forEach((l) => l(brand));
  inflight = null;
  return brand;
  })();
  return inflight;
}

export function useBrand(): Brand {
  const [brand, setBrand] = useState<Brand>(cached ?? { logoUrl: null, companyName: "FIRE" });

  useEffect(() => {
    listeners.add(setBrand);
    if (!cached) void fetchBrand();
    return () => { listeners.delete(setBrand); };
  }, []);

  return brand;
}

export function refreshBrand() { void fetchBrand(); }
