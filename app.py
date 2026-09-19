from __future__ import annotations

import streamlit as st

from services.search import (
    CATEGORIES,
    SearchError,
    companies_to_csv,
    format_cep,
    search_companies,
)


st.set_page_config(
    page_title="GeoProspect",
    page_icon="📍",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown(
    """
    <style>
      :root {
        --gp-green: #0b6b51;
        --gp-dark: #13231f;
        --gp-muted: #60736d;
        --gp-border: #dce7e3;
        --gp-soft: #e9f5f0;
      }
      .stApp { background: #f4f7f6; color: var(--gp-dark); }
      [data-testid="stHeader"] { background: rgba(244,247,246,.92); }
      [data-testid="stSidebar"] { background: #ffffff; border-right: 1px solid var(--gp-border); }
      [data-testid="stSidebar"] > div:first-child { padding-top: 1.5rem; }
      .block-container { max-width: 1440px; padding-top: 2rem; padding-bottom: 3rem; }
      .gp-brand { display: flex; align-items: center; gap: .8rem; margin-bottom: 1.6rem; }
      .gp-pin { width: 46px; height: 46px; display: grid; place-items: center; border-radius: 14px; background: var(--gp-soft); font-size: 24px; }
      .gp-brand strong { font-size: 1.25rem; letter-spacing: -.03em; }
      .gp-eyebrow { color: var(--gp-green); font-size: .78rem; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
      .gp-title { max-width: 850px; margin: .45rem 0 .6rem; font-size: clamp(2rem,4vw,3.25rem); line-height: 1.05; letter-spacing: -.045em; }
      .gp-subtitle { max-width: 760px; color: var(--gp-muted); font-size: 1.05rem; line-height: 1.7; margin-bottom: 1.6rem; }
      .gp-note { padding: 1rem; border-radius: 14px; background: #f1f7f5; color: #557069; font-size: .9rem; line-height: 1.55; }
      div[data-testid="stMetric"] { background: #fff; border: 1px solid var(--gp-border); border-radius: 16px; padding: 1rem 1.1rem; box-shadow: 0 8px 28px rgba(24,67,55,.04); }
      div[data-testid="stMetricLabel"] { color: var(--gp-muted); font-weight: 650; }
      div[data-testid="stMetricValue"] { font-weight: 850; letter-spacing: -.04em; }
      .stButton > button, .stDownloadButton > button { border-radius: 10px; font-weight: 750; min-height: 2.75rem; }
      .stButton > button[kind="primary"] { background: var(--gp-green); border-color: var(--gp-green); }
      .stButton > button[kind="primary"]:hover { background: #08563f; border-color: #08563f; }
      [data-testid="stDataFrame"] { border: 1px solid var(--gp-border); border-radius: 16px; overflow: hidden; background: #fff; }
      .gp-footer { color: #758781; font-size: .78rem; line-height: 1.6; padding-top: .6rem; }
    </style>
    """,
    unsafe_allow_html=True,
)


def initialize_state() -> None:
    st.session_state.setdefault("companies", [])
    st.session_state.setdefault("location", "")
    st.session_state.setdefault("searched", False)
    st.session_state.setdefault("last_cep", "")


initialize_state()

with st.sidebar:
    st.markdown(
        '<div class="gp-brand"><div class="gp-pin">📍</div><strong>GeoProspect</strong></div>',
        unsafe_allow_html=True,
    )
    st.subheader("Configurar busca")
    with st.form("search_form"):
        cep = st.text_input("CEP de referência", placeholder="00000-000", max_chars=9)
        category = st.selectbox(
            "Segmento",
            options=list(CATEGORIES),
            format_func=lambda key: CATEGORIES[key]["label"],
        )
        radius_col, limit_col = st.columns(2)
        with radius_col:
            radius = st.selectbox("Raio", options=[1, 3, 5, 10], index=1, format_func=lambda value: f"{value} km")
        with limit_col:
            limit = st.selectbox("Limite", options=[25, 50, 100], index=1)
        submitted = st.form_submit_button("🔎 Buscar empresas", type="primary", use_container_width=True)

    st.markdown(
        """
        <div class="gp-note"><strong>Como funciona</strong><br>
        Localizamos o CEP e consultamos estabelecimentos cadastrados no OpenStreetMap.
        Alguns contatos podem não estar disponíveis.</div>
        """,
        unsafe_allow_html=True,
    )

if submitted:
    try:
        with st.spinner("Consultando fontes públicas..."):
            result = search_companies(
                cep=cep,
                category=category,
                radius_km=radius,
                limit=limit,
            )
        st.session_state.companies = result.companies
        st.session_state.location = result.location
        st.session_state.searched = True
        st.session_state.last_cep = format_cep(cep)
    except SearchError as error:
        st.session_state.companies = []
        st.session_state.searched = False
        st.error(str(error))

st.markdown('<div class="gp-eyebrow">Prospecção regional</div>', unsafe_allow_html=True)
st.markdown('<h1 class="gp-title">Encontre potenciais clientes perto de onde o comercial atua.</h1>', unsafe_allow_html=True)
st.markdown(
    '<p class="gp-subtitle">Pesquise empresas por localização, organize os dados públicos disponíveis e exporte uma lista pronta para validação comercial.</p>',
    unsafe_allow_html=True,
)

companies = st.session_state.companies
phone_count = sum(bool(item["Telefone"]) for item in companies)
email_count = sum(bool(item["E-mail"]) for item in companies)
site_count = sum(bool(item["Site"]) for item in companies)

metric_columns = st.columns(4)
metric_columns[0].metric("Empresas encontradas", len(companies))
metric_columns[1].metric("Com telefone", phone_count)
metric_columns[2].metric("Com e-mail", email_count)
metric_columns[3].metric("Com site", site_count)

st.write("")
header_col, filter_col, export_col = st.columns([5, 2, 2])
with header_col:
    st.subheader("Resultados da busca")
    st.caption(st.session_state.location or "Informe os critérios para iniciar")
with filter_col:
    only_contact = st.toggle("Apenas com contato", value=False)

visible_companies = [
    company
    for company in companies
    if not only_contact or company["Telefone"] or company["E-mail"]
]

with export_col:
    st.write("")
    st.download_button(
        "⬇ Exportar CSV",
        data=companies_to_csv(visible_companies),
        file_name=f"empresas-{st.session_state.last_cep.replace('-', '') or 'geoprospect'}.csv",
        mime="text/csv;charset=utf-8",
        use_container_width=True,
        disabled=not visible_companies,
    )

if visible_companies:
    st.dataframe(
        visible_companies,
        use_container_width=True,
        hide_index=True,
        column_config={
            "Site": st.column_config.LinkColumn("Site", display_text="Abrir site"),
            "Distância (km)": st.column_config.NumberColumn("Distância (km)", format="%.1f km"),
        },
    )
elif st.session_state.searched:
    st.info("Nenhuma empresa encontrada. Tente aumentar o raio, mudar o segmento ou retirar o filtro de contatos.")
else:
    st.info("Sua lista começa pelo CEP. Preencha os campos ao lado para localizar empresas e contatos públicos.")

st.markdown(
    '<div class="gp-footer">Dados obtidos de ViaCEP, Nominatim e OpenStreetMap. As informações devem ser validadas antes do contato comercial.</div>',
    unsafe_allow_html=True,
)
