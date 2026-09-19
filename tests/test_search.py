import unittest

from services.search import address_from_tags, clean_cep, companies_to_csv, format_cep, haversine_km


class SearchHelpersTest(unittest.TestCase):
    def test_cep_helpers(self) -> None:
        self.assertEqual(clean_cep("01310-100"), "01310100")
        self.assertEqual(format_cep("01310100"), "01310-100")

    def test_haversine_same_position(self) -> None:
        self.assertEqual(haversine_km(-23.5, -46.6, -23.5, -46.6), 0)

    def test_address_from_tags(self) -> None:
        tags = {"addr:street": "Avenida Paulista", "addr:housenumber": "1000", "addr:city": "São Paulo"}
        self.assertEqual(address_from_tags(tags), "Avenida Paulista, 1000 • São Paulo")

    def test_csv_uses_semicolon_and_utf8_bom(self) -> None:
        rows = [{"Empresa": "Clínica São José", "Segmento": "Saúde"}]
        content = companies_to_csv(rows)
        self.assertTrue(content.startswith(b"\xef\xbb\xbf"))
        self.assertIn("Clínica São José", content.decode("utf-8"))
        self.assertIn(";", content.decode("utf-8"))


if __name__ == "__main__":
    unittest.main()
