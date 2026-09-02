import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/microsoft_onedrive/v1.0";

export type DriveItem = {
  id: string;
  name: string;
  isFolder: boolean;
  childCount: number;
  size: number;
  mimeType: string | null;
  path: string;
};

function sanitizePath(raw: string) {
  const path = raw.replace(/^\/+|\/+$/g, "");
  if (!path) return "";
  if (path.includes("..") || path.includes(":")) {
    throw new Error("Caminho inválido.");
  }
  return path;
}

async function graph(path: string) {
  const apiKey = process.env["MICROSOFT_ONEDRIVE_API_KEY"];
  const lovableKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey || !lovableKey) throw new Error("Conexão com o OneDrive não está configurada.");

  const res = await fetch(`${GATEWAY_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": apiKey,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`OneDrive gateway failed [${res.status}]: ${body}`);
    throw new Error(`OneDrive respondeu ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json() as Promise<Record<string, any>>;
}

export const listOneDriveFolder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { path?: string }) => ({ path: sanitizePath(input?.path ?? "") }))
  .handler(async ({ data }) => {
    const encoded = data.path
      .split("/")
      .map((seg) => encodeURIComponent(seg))
      .join("/");
    const target = data.path
      ? `/me/drive/root:/${encoded}:/children`
      : `/me/drive/root/children`;
    const json = await graph(
      `${target}?$top=200&$select=id,name,folder,file,size&$orderby=name`,
    );

    const items: DriveItem[] = (json["value"] ?? []).map((raw: Record<string, any>) => ({
      id: String(raw["id"]),
      name: String(raw["name"]),
      isFolder: !!raw["folder"],
      childCount: raw["folder"]?.childCount ?? 0,
      size: Number(raw["size"] ?? 0),
      mimeType: raw["file"]?.mimeType ?? null,
      path: data.path ? `${data.path}/${raw["name"]}` : String(raw["name"]),
    }));

    items.sort((a, b) =>
      a.isFolder === b.isFolder ? a.name.localeCompare(b.name, "pt-BR") : a.isFolder ? -1 : 1,
    );

    return { path: data.path, items };
  });

export const getOneDriveFileUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { itemId: string }) => {
    const itemId = String(input?.itemId ?? "");
    if (!/^[A-Za-z0-9!._-]+$/.test(itemId)) throw new Error("Arquivo inválido.");
    return { itemId };
  })
  .handler(async ({ data }) => {
    const json = await graph(`/me/drive/items/${encodeURIComponent(data.itemId)}`);
    const url = json["@microsoft.graph.downloadUrl"] as string | undefined;
    if (!url) throw new Error("Não foi possível gerar o link do arquivo.");
    return { url, name: String(json["name"] ?? "arquivo") };
  });
