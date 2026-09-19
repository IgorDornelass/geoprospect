"use client";

import { FormEvent, useMemo, useState } from "react";
import { Building2, Download, ExternalLink, Globe2, Mail, MapPin, Phone, Search, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Company = { id: string; name: string; category: string; phone: string; email: string; website: string; address: string; distance: number };
type OsmItem = { id: number; type: string; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> };
type ViaCepData = { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string };
type GeoItem = { lat: string; lon: string };
type OverpassData = { elements: OsmItem[] };

const categories: Record<string, { label: string; query: string }> = {
  clinicas: { label: "Clínicas e saúde", query: '["amenity"~"clinic|doctors|dentist|hospital"]' },
  condominios: { label: "Condomínios residenciais", query: '["building"~"apartments|residential"]["name"]' },
  escolas: { label: "Escolas e faculdades", query: '["amenity"~"school|college|university|kindergarten"]' },
  mercados: { label: "Mercados e atacados", query: '["shop"~"supermarket|convenience|wholesale"]' },
  restaurantes: { label: "Restaurantes e cafés", query: '["amenity"~"restaurant|cafe|fast_food"]' },
  oficinas: { label: "Oficinas automotivas", query: '["shop"~"car_repair|car|tyres"]' },
  academias: { label: "Academias", query: '["leisure"~"fitness_centre|sports_centre"]' },
  hoteis: { label: "Hotéis e pousadas", query: '["tourism"~"hotel|hostel|guest_house"]' },
  industrias: { label: "Indústrias", query: '["landuse"="industrial"]["name"]' },
  todos: { label: "Todos os estabelecimentos", query: '["name"]["phone"]' },
};

const digitsOnly = (value: string) => value.replace(/\D/g, "").slice(0, 8);
const formatCep = (value: string) => {
  const digits = digitsOnly(value);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
};
const distanceKm = (a: number, b: number, c: number, d: number) => {
  const rad = (n: number) => (n * Math.PI) / 180;
  const x = rad(c - a), y = rad(d - b);
  const h = Math.sin(x / 2) ** 2 + Math.cos(rad(a)) * Math.cos(rad(c)) * Math.sin(y / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};
const addressOf = (tags: Record<string, string>) =>
  [
    tags["addr:street"] && `${tags["addr:street"]}${tags["addr:housenumber"] ? `, ${tags["addr:housenumber"]}` : ""}`,
    tags["addr:suburb"] || tags["addr:neighbourhood"],
    tags["addr:city"],
  ].filter(Boolean).join(" • ") || "Endereço não informado";

export default function Home() {
  const [cep, setCep] = useState("");
  const [category, setCategory] = useState("clinicas");
  const [radius, setRadius] = useState("3");
  const [limit, setLimit] = useState("50");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [location, setLocation] = useState("");
  const [onlyContact, setOnlyContact] = useState(false);

  const visible = useMemo(() => companies.filter((item) => !onlyContact || item.phone || item.email), [companies, onlyContact]);
  const phoneCount = companies.filter((item) => item.phone).length;
  const emailCount = companies.filter((item) => item.email).length;
  const siteCount = companies.filter((item) => item.website).length;

  async function searchCompanies(event: FormEvent) {
    event.preventDefault();
    const postalCode = digitsOnly(cep);
    if (postalCode.length !== 8) return setError("Digite um CEP válido com 8 números.");
    setLoading(true); setError(""); setSearched(false); setCompanies([]);
    try {
      const viaCep = await fetch(`https://viacep.com.br/ws/${postalCode}/json/`);
      if (!viaCep.ok) throw new Error("Não foi possível consultar o CEP.");
      const address = await viaCep.json() as ViaCepData;
      if (address.erro) throw new Error("CEP não encontrado.");
      const place = [address.logradouro, address.bairro, address.localidade, address.uf, "Brasil"].filter(Boolean).join(", ");
      setLocation([address.bairro, address.localidade, address.uf].filter(Boolean).join(" • "));

      const geoResponse = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&q=${encodeURIComponent(place)}`);
      const geo = await geoResponse.json() as GeoItem[];
      if (!geo.length) throw new Error("Não foi possível localizar este CEP no mapa.");
      const lat = Number(geo[0].lat), lon = Number(geo[0].lon);
      const query = `[out:json][timeout:25];(nwr${categories[category].query}(around:${Number(radius) * 1000},${lat},${lon}););out center tags;`;
      const osmResponse = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: `data=${encodeURIComponent(query)}`,
      });
      if (!osmResponse.ok) throw new Error("A fonte pública está ocupada. Tente novamente em alguns instantes.");
      const osm = await osmResponse.json() as OverpassData;
      const seen = new Set<string>();
      const results = (osm.elements as OsmItem[])
        .filter((item) => item.tags?.name)
        .map((item) => {
          const tags = item.tags || {};
          const itemLat = item.lat ?? item.center?.lat ?? lat;
          const itemLon = item.lon ?? item.center?.lon ?? lon;
          return {
            id: `${item.type}-${item.id}`, name: tags.name, category: categories[category].label,
            phone: tags["contact:phone"] || tags.phone || tags["contact:mobile"] || "",
            email: tags["contact:email"] || tags.email || "",
            website: tags["contact:website"] || tags.website || "",
            address: addressOf(tags), distance: distanceKm(lat, lon, itemLat, itemLon),
          };
        })
        .filter((item) => {
          const key = `${item.name.toLowerCase()}|${item.address.toLowerCase()}`;
          if (seen.has(key)) return false; seen.add(key); return true;
        })
        .sort((a, b) => a.distance - b.distance)
        .slice(0, Number(limit));
      setCompanies(results); setSearched(true);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Ocorreu um erro durante a busca.");
    } finally { setLoading(false); }
  }

  function exportCsv() {
    const rows = visible.map((item) => [item.name, item.category, item.phone || "Não encontrado", item.email || "Não encontrado", item.website || "Não encontrado", item.address, item.distance.toFixed(1)]);
    const csv = [["Empresa", "Segmento", "Telefone", "E-mail", "Site", "Endereço", "Distância (km)"], ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `empresas-${digitsOnly(cep)}.csv`; link.click(); URL.revokeObjectURL(url);
  }

  const stats = [
    { value: companies.length, label: "Empresas encontradas", icon: Building2 },
    { value: phoneCount, label: "Com telefone", icon: Phone },
    { value: emailCount, label: "Com e-mail", icon: Mail },
    { value: siteCount, label: "Com site", icon: Globe2 },
  ];

  return (
    <main className="min-h-screen bg-[#f4f7f6] text-[#13231f]">
      <header className="border-b border-[#dfe8e4] bg-white">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-4 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center overflow-hidden rounded-xl bg-[#e9f5f0] shadow-sm"><img src="/favicon.svg" alt="" className="size-9 object-contain" /></div>
            <h1 className="text-xl font-black tracking-[-0.03em]">GeoProspect</h1>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-[#cfe0da] bg-[#f4faf7] px-3 py-2 text-sm font-semibold text-[#356458] sm:flex"><ShieldCheck className="size-4 text-[#0b6b51]" /> Fontes públicas e gratuitas</div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-6 px-5 py-7 lg:grid-cols-[330px_minmax(0,1fr)] lg:px-10 lg:py-10">
        <aside className="h-fit rounded-2xl border border-[#dce7e3] bg-white p-5 shadow-[0_12px_40px_rgba(24,67,55,0.06)] lg:sticky lg:top-6">
          <div className="mb-5 flex items-center gap-2"><SlidersHorizontal className="size-4 text-[#0b6b51]" /><h2 className="font-bold">Configurar busca</h2></div>
          <form className="space-y-4" onSubmit={searchCompanies}>
            <label className="block space-y-2"><span className="text-sm font-semibold">CEP de referência</span><Input value={cep} onChange={(e) => setCep(formatCep(e.target.value))} placeholder="00000-000" inputMode="numeric" className="h-11 border-[#cbdad5] bg-[#fbfdfc]" /></label>
            <label className="block space-y-2"><span className="text-sm font-semibold">Segmento</span><NativeSelect value={category} onChange={(e) => setCategory(e.target.value)} className="h-11 w-full border-[#cbdad5] bg-[#fbfdfc]">{Object.entries(categories).map(([value, item]) => <NativeSelectOption key={value} value={value}>{item.label}</NativeSelectOption>)}</NativeSelect></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-2"><span className="text-sm font-semibold">Raio</span><NativeSelect value={radius} onChange={(e) => setRadius(e.target.value)} className="h-11 w-full border-[#cbdad5] bg-[#fbfdfc]">{[1,3,5,10].map((n) => <NativeSelectOption key={n} value={n}>{n} km</NativeSelectOption>)}</NativeSelect></label>
              <label className="block space-y-2"><span className="text-sm font-semibold">Limite</span><NativeSelect value={limit} onChange={(e) => setLimit(e.target.value)} className="h-11 w-full border-[#cbdad5] bg-[#fbfdfc]">{[25,50,100].map((n) => <NativeSelectOption key={n} value={n}>{n}</NativeSelectOption>)}</NativeSelect></label>
            </div>
            <Button type="submit" disabled={loading} className="h-11 w-full bg-[#0b6b51] font-bold hover:bg-[#08563f]"><Search className="size-4" />{loading ? "Buscando empresas..." : "Buscar empresas"}</Button>
          </form>
          <div className="mt-5 rounded-xl bg-[#f1f7f5] p-4 text-sm leading-6 text-[#557069]"><p className="font-bold text-[#264d43]">Como funciona</p><p>Localizamos o CEP e consultamos estabelecimentos cadastrados no OpenStreetMap. Alguns contatos podem não estar disponíveis.</p></div>
        </aside>

        <section className="min-w-0">
          <div className="mb-6"><p className="mb-2 text-sm font-bold uppercase tracking-[0.16em] text-[#0b6b51]">Prospecção regional</p><h2 className="max-w-3xl text-3xl font-black tracking-[-0.04em] sm:text-4xl">Encontre potenciais clientes perto de onde o comercial atua.</h2><p className="mt-3 max-w-2xl text-base leading-7 text-[#5c706a]">Pesquise empresas por localização, organize os dados públicos disponíveis e exporte uma lista pronta para validação comercial.</p></div>
          {error && <div role="alert" className="mb-5 rounded-xl border border-[#f0b9b2] bg-[#fff5f3] px-4 py-3 text-sm font-semibold text-[#9b3327]">{error}</div>}
          <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{stats.map(({ value, label, icon: Icon }) => <div key={label} className="rounded-2xl border border-[#dce7e3] bg-white p-4 shadow-[0_8px_30px_rgba(24,67,55,0.04)]"><div className="mb-4 flex items-center justify-between"><span className="text-sm font-semibold text-[#657872]">{label}</span><span className="grid size-8 place-items-center rounded-lg bg-[#e9f5f0] text-[#0b6b51]"><Icon className="size-4" /></span></div><strong className="text-3xl font-black tracking-[-0.04em]">{value}</strong></div>)}</div>

          <div className="overflow-hidden rounded-2xl border border-[#dce7e3] bg-white shadow-[0_12px_40px_rgba(24,67,55,0.05)]">
            <div className="flex flex-col gap-3 border-b border-[#e2ebe8] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div><h3 className="font-extrabold">Resultados da busca</h3><p className="mt-1 text-sm text-[#6a7d77]">{location || "Informe os critérios para iniciar"}</p></div>
              <div className="flex flex-wrap items-center gap-2"><label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#d6e2de] px-3 py-2 text-sm font-semibold"><input type="checkbox" checked={onlyContact} onChange={(e) => setOnlyContact(e.target.checked)} className="accent-[#0b6b51]" /> Apenas com contato</label><Button variant="outline" onClick={exportCsv} className="border-[#cbdad5]"><Download className="size-4" /> Exportar CSV</Button></div>
            </div>

            {!searched && !loading && <Empty icon={MapPin} title="Sua lista começa pelo CEP" text="Preencha os campos ao lado para localizar empresas e contatos públicos na região escolhida." />}
            {loading && <div className="grid min-h-[330px] place-items-center px-6 py-12 text-center"><div><div className="mx-auto mb-4 size-10 animate-spin rounded-full border-4 border-[#d9ebe4] border-t-[#0b6b51]" /><p className="font-bold">Consultando fontes públicas...</p><p className="mt-1 text-sm text-[#6a7d77]">A busca pode levar alguns segundos.</p></div></div>}
            {searched && !loading && !visible.length && <Empty icon={Search} title="Nenhuma empresa encontrada" text="Tente aumentar o raio, mudar o segmento ou retirar o filtro de contatos." />}
            {!!visible.length && <Table><TableHeader className="bg-[#f7faf9]"><TableRow><TableHead className="px-5">Empresa</TableHead><TableHead>Telefone</TableHead><TableHead>E-mail</TableHead><TableHead>Endereço</TableHead><TableHead className="pr-5 text-right">Distância</TableHead></TableRow></TableHeader><TableBody>{visible.map((item) => <TableRow key={item.id} className="border-[#edf2f0]">
              <TableCell className="px-5 py-4"><div className="max-w-[260px]"><p className="font-extrabold whitespace-normal">{item.name}</p><div className="mt-1 flex items-center gap-2 text-xs text-[#6a7d77]"><span>{item.category}</span>{item.website && <a href={item.website.startsWith("http") ? item.website : `https://${item.website}`} target="_blank" rel="noreferrer" aria-label={`Abrir site de ${item.name}`} className="text-[#0b6b51]"><ExternalLink className="size-3.5" /></a>}</div></div></TableCell>
              <TableCell>{item.phone || <Missing />}</TableCell><TableCell>{item.email ? <a href={`mailto:${item.email}`} className="text-[#0b6b51] hover:underline">{item.email}</a> : <Missing />}</TableCell><TableCell><span className="block max-w-[300px] whitespace-normal text-[#556b64]">{item.address}</span></TableCell><TableCell className="pr-5 text-right font-bold">{item.distance.toFixed(1)} km</TableCell>
            </TableRow>)}</TableBody></Table>}
          </div>
          <p className="mt-4 text-xs leading-5 text-[#758781]">Dados obtidos de ViaCEP e OpenStreetMap. As informações devem ser validadas antes do contato comercial.</p>
        </section>
      </div>
    </main>
  );
}

function Missing() { return <span className="text-[#9aaaa5]">Não encontrado</span>; }
function Empty({ icon: Icon, title, text }: { icon: typeof Search; title: string; text: string }) {
  return <div className="grid min-h-[330px] place-items-center px-6 py-12 text-center"><div className="max-w-md"><div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-[#e8f4ef] text-[#0b6b51]"><Icon className="size-6" /></div><h3 className="text-lg font-extrabold">{title}</h3><p className="mt-2 leading-6 text-[#6a7d77]">{text}</p></div></div>;
}
