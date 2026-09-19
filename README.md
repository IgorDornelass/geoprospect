<div align="center">
  <img src="./public/geoprospect-logo.png" alt="GeoProspect" width="140" />

  # GeoProspect

  **Oportunidades comerciais por localização**

  Aplicação web para localizar empresas por CEP, segmento e raio de busca utilizando fontes públicas e gratuitas.
</div>

## Sobre o projeto

O GeoProspect é um MVP criado para reduzir o tempo gasto em pesquisas manuais durante a prospecção comercial. A aplicação transforma um CEP em uma localização de referência, encontra estabelecimentos próximos e organiza os contatos públicos disponíveis.

> Os resultados dependem do nível de preenchimento das fontes públicas e podem estar incompletos. Todos os dados devem ser validados antes de qualquer contato comercial.

## Funcionalidades

- pesquisa de empresas por CEP;
- seleção de segmento comercial;
- definição de raio entre 1 e 10 km;
- limite configurável de resultados;
- apresentação de telefone, e-mail, site e endereço, quando disponíveis;
- cálculo de distância aproximada;
- filtro de empresas que possuem contato;
- remoção de resultados duplicados;
- exportação da lista em CSV;
- interface responsiva para computador e celular;
- funcionamento sem APIs pagas.

## Tecnologias

- TypeScript;
- React;
- Vinext;
- Tailwind CSS;
- ViaCEP;
- Nominatim;
- OpenStreetMap;
- Overpass API.

## Como executar

### Pré-requisitos

- Node.js 22 ou superior;
- pnpm.

### Instalação

```bash
git clone https://github.com/IgorDornelass/geoprospect.git
cd geoprospect
pnpm install
pnpm dev
```

Depois, abra o endereço informado pelo terminal.

## Como usar

1. Digite um CEP brasileiro válido.
2. Selecione o segmento desejado.
3. Escolha o raio e o limite de resultados.
4. Clique em **Buscar empresas**.
5. Filtre ou exporte os resultados em CSV.

## Fontes de dados

- [ViaCEP](https://viacep.com.br/) — consulta de endereços brasileiros;
- [OpenStreetMap](https://www.openstreetmap.org/) — dados geográficos colaborativos;
- [Nominatim](https://nominatim.org/) — geocodificação;
- [Overpass API](https://overpass-api.de/) — consulta de estabelecimentos.

O uso dessas fontes deve respeitar seus respectivos termos, políticas de atribuição e limites de requisição.

## Limitações atuais

- nem todas as empresas possuem telefone, e-mail ou site cadastrados;
- a cobertura varia conforme a região;
- os contatos não são enriquecidos por serviços pagos;
- servidores públicos podem ficar temporariamente ocupados;
- o projeto ainda não possui autenticação, CRM ou histórico persistente.

## Roadmap

- [x] pesquisa por CEP e segmento;
- [x] busca por raio;
- [x] filtros de contato;
- [x] exportação em CSV;
- [ ] exportação em Excel;
- [ ] busca complementar nos sites oficiais;
- [ ] histórico de pesquisas;
- [ ] status de prospecção;
- [ ] integração com CRM;
- [ ] testes automatizados.

## Privacidade e uso responsável

O projeto trabalha somente com informações empresariais publicamente disponíveis. Não inclua dados pessoais, listas comerciais reais, credenciais ou informações confidenciais no repositório.

## Autor

Desenvolvido por [Igor Dornelas](https://github.com/IgorDornelass).

## Licença

Distribuído sob a licença MIT. Consulte o arquivo [LICENSE](./LICENSE).
