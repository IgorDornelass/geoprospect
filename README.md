<div align="center">

# GeoProspect

**Oportunidades comerciais por localização**

Aplicação web em Python para localizar empresas por CEP, segmento e raio de busca utilizando fontes públicas e gratuitas.

</div>

## Sobre o projeto

O GeoProspect é um MVP desenvolvido em **Python com Streamlit** para reduzir o tempo gasto em pesquisas manuais durante a prospecção comercial. A aplicação transforma um CEP em uma localização de referência, encontra estabelecimentos próximos e organiza os contatos públicos disponíveis.

> Os resultados dependem do preenchimento das fontes públicas e podem estar incompletos. Todos os dados devem ser validados antes de qualquer contato comercial.

## Funcionalidades

- pesquisa de empresas por CEP;
- seleção de segmento comercial;
- raio de busca entre 1 e 10 km;
- apresentação de telefone, e-mail, site e endereço quando disponíveis;
- filtro de empresas com contato;
- remoção de duplicidades;
- cálculo de distância aproximada;
- exportação da lista em CSV;
- interface responsiva;
- funcionamento sem APIs pagas.

## Tecnologias

- Python 3.11+;
- Streamlit;
- biblioteca padrão do Python para requisições HTTP;
- ViaCEP;
- Nominatim;
- OpenStreetMap;
- Overpass API.

## Como executar

```bash
git clone https://github.com/IgorDornelass/geoprospect.git
cd geoprospect

python -m venv .venv
```

Ative o ambiente virtual:

```bash
# Windows
.venv\Scripts\activate

# Linux ou macOS
source .venv/bin/activate
```

Instale e execute:

```bash
pip install -r requirements.txt
streamlit run app.py
```

## Estrutura

```text
geoprospect/
├── .streamlit/
│   └── config.toml
├── services/
│   └── search.py
├── tests/
│   └── test_search.py
├── app.py
├── requirements.txt
└── README.md
```

## Fontes de dados

- [ViaCEP](https://viacep.com.br/) — consulta de endereços brasileiros;
- [OpenStreetMap](https://www.openstreetmap.org/) — dados geográficos colaborativos;
- [Nominatim](https://nominatim.org/) — geocodificação;
- [Overpass API](https://overpass-api.de/) — consulta de estabelecimentos.

O uso dessas fontes deve respeitar seus termos, políticas de atribuição e limites de requisição.

## Limitações atuais

- nem todas as empresas possuem telefone, e-mail ou site cadastrados;
- a cobertura varia conforme a região;
- servidores públicos podem ficar temporariamente ocupados;
- o projeto ainda não possui autenticação, CRM ou histórico persistente.

## Uso responsável

O projeto trabalha somente com informações empresariais publicamente disponíveis. Não inclua dados pessoais, credenciais ou informações confidenciais no repositório.

## Autor

Desenvolvido por [Igor Dornelas](https://github.com/IgorDornelass).

## Licença

Distribuído sob a licença MIT. Consulte o arquivo [LICENSE](./LICENSE).
