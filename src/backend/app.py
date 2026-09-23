"""
API de shoppings próximos por CEP — Landing page DM
-----------------------------------------------------
Fluxo:
1. Recebe um CEP do frontend (TS) via GET /api/shoppings/<cep>
2. Consulta a API pública ViaCEP para validar o CEP e obter o endereço/cidade
3. Consulta a API pública Nominatim (OpenStreetMap) para geocodificar o
   endereço em latitude/longitude
4. Calcula a distância (fórmula de Haversine) entre o usuário e uma lista
   mockada de shoppings com coordenadas fixas
5. Retorna em JSON os shoppings ordenados por proximidade

Como não existe uma API pública gratuita de "shoppings próximos", a lista
de shoppings é mockada aqui (MOCK_SHOPPINGS). Em produção, isso poderia vir
de um banco de dados ou de uma API de POIs (ex: Google Places, aqui não
usada por exigir chave paga).
"""

import re
import math
from flask import Flask, jsonify
from flask_cors import CORS
import requests
from dotenv import load_dotenv

import db

load_dotenv()  # carrega variáveis de ambiente do arquivo .env

app = Flask(__name__)
CORS(app)
app.config["PROPAGATE_EXCEPTIONS"] = False


@app.after_request
def adicionar_cors(resp):
    """Permite que o frontend, hospedado em outra origem, consuma a API."""
    resp.headers["Access-Control-Allow-Origin"] = "*"
    resp.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return resp

@app.errorhandler(Exception)
def tratar_erro_inesperado(erro):
    app.logger.exception(erro)
    return jsonify({"erro": "Erro interno ao buscar lojas próximas. Tente novamente."}), 500

VIACEP_URL = "https://viacep.com.br/ws/{cep}/json/"
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# User-Agent é obrigatório para uso das API's públicas do OpenStreetMap (Nominatim e Overpass).
# sem isso, elas podem bloquear a requisição.
OSM_HEADERS = {"User-Agent": "dm-landing-page-shoppings/1.0"}

MAX_DISTANCIA_KM = 25

def somente_digitos(texto: str) -> str:
    return re.sub(r"\D", "", texto or "")


def haversine_km(lat1, lon1, lat2, lon2) -> float:
    """Distância em linha reta (km) entre dois pontos geográficos."""
    R = 6371.0  # raio médio da Terra em km
    p1, p2 = math.radians(lat1), math.radians(lat2)
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = math.sin(d_lat / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(d_lon / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def buscar_endereco_por_cep(cep: str):
    """Consulta o ViaCEP. Retorna dict com endereço ou None se inválido."""
    resp = requests.get(VIACEP_URL.format(cep=cep), timeout=5)
    resp.raise_for_status()
    dados = resp.json()
    if dados.get("erro"):
        return None
    return dados


def geocodificar_endereco(endereco: dict):
    """Usa o Nominatim para transformar o endereço do ViaCEP em lat/lon."""
    query = f"{endereco.get('logradouro', '')}, {endereco.get('bairro', '')}, " \
            f"{endereco.get('localidade', '')} - {endereco.get('uf', '')}, Brasil"
    params = {"q": query, "format": "json", "limit": 1}
    resp = requests.get(NOMINATIM_URL, params=params, headers=OSM_HEADERS, timeout=5)
    resp.raise_for_status()
    resultados = resp.json()
    if not resultados:
        return None
    return float(resultados[0]["lat"]), float(resultados[0]["lon"])

def montar_endereco(tags: dict) -> str:
    partes = []
    if tags.get("addr:street"):
        rua = tags["addr:street"]
        if tags.get("addr:housenumber"):
            rua += f", {tags['addr:housenumber']}"
        partes.append(rua)
    cidade = tags.get("addr:city")
    estado = tags.get("addr:state")
    if cidade:
        partes.append(f"{cidade} - {estado}" if estado else cidade)
    return ", ".join(partes) if partes else "Endereço não disponível"

def buscas_shoppings_via_osm(lat: float, lon: float, raio_km: float):
    """
    Consulta a Overpass API por locais marcados como shop=mall dentro de
    um raio (em metros) da coordenada do usuário. Funciona para qualquer
    ponto do Brasil (ou do mundo) — não depende de uma lista pré-cadastrada.
    """
    raio_m = int(raio_km * 1000)
    query = f"""
        [out:json][timeout:20];
        (
          node["shop"="mall"](around:{raio_m},{lat},{lon});
          way["shop"="mall"](around:{raio_m},{lat},{lon});
          relation["shop"="mall"](around:{raio_m},{lat},{lon});
        );
        out center tags;
    """
    resp = requests.post(OVERPASS_URL, data={"data": query}, headers=OSM_HEADERS, timeout=20)
    resp.raise_for_status()
    elementos = resp.json().get("elements", [])
 
    shoppings = []
    nomes_ja_vistos = set()
 
    for elemento in elementos:
        tags = elemento.get("tags", {})
        nome = tags.get("name")
        if not nome or nome in nomes_ja_vistos:
            # ignora shoppings sem nome no OSM e duplicatas (o mesmo
            # shopping pode existir como "way" e "relation" ao mesmo tempo)
            continue
 
        if elemento["type"] == "node":
            shopping_lat, shopping_lon = elemento["lat"], elemento["lon"]
        else:
            centro = elemento.get("center")
            if not centro:
                continue
            shopping_lat, shopping_lon = centro["lat"], centro["lon"]
 
        nomes_ja_vistos.add(nome)
        distancia = haversine_km(lat, lon, shopping_lat, shopping_lon)
        shoppings.append({
            "nome": nome,
            "endereco": montar_endereco(tags),
            "distancia_km": round(distancia, 1),
        })
 
    shoppings.sort(key=lambda s: s["distancia_km"])
    return shoppings

@app.route("/api/shoppings/<cep>", methods=["GET"])
def shoppings_proximos(cep):
    cep_limpo = somente_digitos(cep)

    if len(cep_limpo) != 8:
        return jsonify({"erro": "CEP inválido. Informe 8 dígitos."}), 400

    try:
        endereco = buscar_endereco_por_cep(cep_limpo)
    except requests.RequestException:
        return jsonify({"erro": "Não foi possível consultar o CEP no momento."}), 502

    if endereco is None:
        return jsonify({"erro": "CEP não encontrado."}), 404

    try:
        coords = geocodificar_endereco(endereco)
    except requests.RequestException:
        return jsonify({"erro": "Não foi possível localizar o endereço."}), 502

    if coords is None:
        return jsonify({"erro": "Não foi possível geolocalizar esse CEP."}), 404

    lat_usuario, lon_usuario = coords

    try:
        db.salvar_busca_cep(cep_limpo, endereco.get("localidade"), endereco.get("uf"), lat_usuario, lon_usuario),
    except Exception:
        app.logger.exception("Erro ao salvar busca de CEP no banco de dados.")

    try:
        shoppings = buscas_shoppings_via_osm(lat_usuario, lon_usuario, MAX_DISTANCIA_KM)
    except requests.RequestException:
        return jsonify({"erro": "Não foi possível buscar shoppings próximos."}), 502

    return jsonify({
        "cep": cep_limpo,
        "cidade": endereco.get("localidade"),
        "uf": endereco.get("uf"),
        "raio_maximo_km": MAX_DISTANCIA_KM,
        "shoppings": shoppings[:5],  # os 5 mais próximos
    })


if __name__ == "__main__":
    app.run(debug=True, port=5000)
