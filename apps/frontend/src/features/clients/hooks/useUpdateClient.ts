export async function updateClient(id: string, data: any) {
  const res = await fetch(`/api/proxy/clients/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Update failed");

  return json.client;
}

export async function createClient(data: any) {
  // Normalize payload to what the backend create endpoint expects
  const payload = {
    name: data.name,
    email: data.email || null,
    phone: data.phone || null,
    notes: data.notes ?? null,
    addressLine1: data.addressLine1 ?? data.address ?? null,
    addressCity: data.addressCity ?? null,
    addressState: data.addressState ?? null,
    addressPostal: data.addressPostal ?? null,
    country: data.country ?? data.addressCountry ?? "US",
  };

  const res = await fetch(`/api/proxy/clients`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Create failed");

  return json.client;
}

export async function deleteClient(id: string) {
  const res = await fetch(`/api/proxy/clients/${id}`, {
    method: "DELETE",
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Delete failed");

  return json;
}
