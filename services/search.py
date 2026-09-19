from __future__ import annotations

import csv
import json
import math
import re
from dataclasses import dataclass
from io import StringIO
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


VIA_CEP_URL = "https://viacep.com.br/ws/{cep}/json/"
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
OVERPASS_URL = "https://overpass-api.de/api/interpreter"
USER_AGENT = "GeoProspect/1.0 (projeto de prospeccao comercial)"

CATEGORIES: dict[str, dict[str, str]] = {
    "clinicas": {"label": "Clínicas e saúde", "query": '["amenity"~"clinic|doctors|dentist|hospital"]'},
    "condominios": {"label": "Condomínios residenciais", "query": '["building"~"apartments|residential"]["name"]'},
    "escolas": {"label": "Escolas e faculdades", "query": '["amenity"~"school|college|university|kindergarten"]'},
    "mercados": {"label": "Mercados e atacados", "query": '["shop"~"supermarket|convenience|wholesale"]'},
    "restaurantes": {"label": "Restaurantes e cafés", "query": '["amenity"~"restaurant|cafe|fast_food"]'},
    "oficinas": {"label": "Oficinas automotivas", "query": '["shop"~"car_repair|car|tyres"]'},
    "academias": {"label": "Academias", "query": '["leisure"~"fitness_centre|sports_centre"]'},
    "hoteis": {"label": "Hotéis e pousadas", "query": '["tourism"~"hotel|hostel|guest_house"]'},
    "industrias": {"label": "Indústrias", "query": '["landuse"="industrial"]["name"]'},
    "todos": {"label": "Todos os estabelecimentos", "query": '["name"]["phone"]'},
}


class SearchError(RuntimeError):
    """Erro compreensível para exibição na interface."""


@dataclass(frozen=True)
class SearchResult:
    companies: list[dict[str, Any]]
    location: str


def clean_cep(value: str) -> str:
    return re.sub(r"\D", "", value)[:8]


def format_cep(value: str) -> str:
    digits = clean_cep(value)
    return f"{digits[:5]}-{digits[5:]}" if len(digits) > 5 else digits


def haversine_km(lat_a: float, lon_a: float, lat_b: float, lon_b: float) -> float:
    lat_delta = math.radians(lat_b - lat_a)
    lon_delta = math.radians(lon_b - lon_a)
    a = (
        math.sin(lat_delta / 2) ** 2
        + math.cos(math.radians(lat_a))
        * math.cos(math.radians(lat_b))
        * math.sin(lon_delta / 2) ** 2
    )
    return 6371 * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def address_from_tags(tags: dict[str, str]) -> str:
    street = tags.get("addr:street", "")
    number = tags.get("addr:housenumber", "")
    first_line = f"{street}, {number}" if street and number else street
    parts = [
        first_line,
        tags.get("addr:suburb") or tags.get("addr:neighbourhood", ""),
        tags.get("addr:city", ""),
    ]
    return " • ".join(part for part in parts if part) or "Endereço não informado"


def companies_to_csv(companies: list[dict[str, Any]]) -> bytes:
    output = StringIO(newline="")
    fieldnames = ["Empresa", "Segmento", "Telefone", "E-mail", "Site", "Endereço", "Distância (km)"]
    writer = csv.DictWriter(output, fieldnames=fieldnames, delimiter=";", extrasaction="ignore")
    writer.writeheader()
    writer.writerows(companies)
    return ("\ufeff" + output.getvalue()).encode("utf-8")


def get_json(url: str, params: dict[str, Any] | None = None, timeout: int = 15) -> Any:
    target = f"{url}?{urlencode(params)}" if params else url
    request = Request(target, headers={"User-Agent": USER_AGENT})
    with urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def post_form_json(url: str, data: dict[str, Any], timeout: int = 35) -> Any:
    request = Request(
        url,
        data=urlencode(data).encode("utf-8"),
        headers={
            "User-Agent": USER_AGENT,
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        method="POST",
    )
    with urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def search_companies(cep: str, category: str, radius_km: int, limit: int) -> SearchResult:
    postal_code = clean_cep(cep)
    if len(postal_code) != 8:
        raise SearchError("Digite um CEP válido com 8 números.")
    if category not in CATEGORIES:
        raise SearchError("Selecione um segmento válido.")

    try:
        address = get_json(VIA_CEP_URL.format(cep=postal_code), timeout=12)
        if address.get("erro"):
            raise SearchError("CEP não encontrado.")

        place = ", ".join(
            part
            for part in [address.get("logradouro"), address.get("bairro"), address.get("localidade"), address.get("uf"), "Brasil"]
            if part
        )
        locations = get_json(
            NOMINATIM_URL,
            params={"format": "jsonv2", "limit": 1, "countrycodes": "br", "q": place},
            timeout=15,
        )
        if not locations:
            raise SearchError("Não foi possível localizar este CEP no mapa.")

        latitude = float(locations[0]["lat"])
        longitude = float(locations[0]["lon"])
        query = (
            "[out:json][timeout:25];("
            f'nwr{CATEGORIES[category]["query"]}(around:{radius_km * 1000},{latitude},{longitude});'
            ");out center tags;"
        )
        osm_data = post_form_json(
            OVERPASS_URL,
            data={"data": query},
            timeout=35,
        )
        elements = osm_data.get("elements", [])
    except SearchError:
        raise
    except (HTTPError, URLError, TimeoutError, ValueError, KeyError, TypeError) as error:
        raise SearchError("A fonte pública está indisponível no momento. Tente novamente em alguns instantes.") from error

    companies: list[dict[str, Any]] = []
    seen: set[str] = set()
    for item in elements:
        tags = item.get("tags") or {}
        name = tags.get("name")
        if not name:
            continue

        center = item.get("center") or {}
        item_lat = float(item.get("lat", center.get("lat", latitude)))
        item_lon = float(item.get("lon", center.get("lon", longitude)))
        company_address = address_from_tags(tags)
        unique_key = f"{name.lower()}|{company_address.lower()}"
        if unique_key in seen:
            continue
        seen.add(unique_key)

        companies.append(
            {
                "Empresa": name,
                "Segmento": CATEGORIES[category]["label"],
                "Telefone": tags.get("contact:phone") or tags.get("phone") or tags.get("contact:mobile", ""),
                "E-mail": tags.get("contact:email") or tags.get("email", ""),
                "Site": tags.get("contact:website") or tags.get("website", ""),
                "Endereço": company_address,
                "Distância (km)": round(haversine_km(latitude, longitude, item_lat, item_lon), 1),
            }
        )

    companies.sort(key=lambda company: company["Distância (km)"])
    location = " • ".join(
        part for part in [address.get("bairro"), address.get("localidade"), address.get("uf")] if part
    )
    return SearchResult(companies=companies[:limit], location=location)
