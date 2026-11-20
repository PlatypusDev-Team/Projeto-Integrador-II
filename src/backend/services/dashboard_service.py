from db import get_connection

def montar_dashboard():
    """Monta os indicadores do dashboard com base na data de criação da solicitação."""
    conexao = get_connection()
    try:
        with conexao.cursor() as cursor:
            cursor.execute("SELECT YEAR(CURRENT_DATE()) AS ano, MONTH(CURRENT_DATE()) AS mes")
            periodo = cursor.fetchone()
            ano = int(periodo["ano"])
            mes = int(periodo["mes"])

            cursor.execute(
                """
                SELECT status, COUNT(*) AS total
                FROM tb_solicitacao
                WHERE YEAR(data_solicitacao) = %s
                  AND MONTH(data_solicitacao) = %s
                GROUP BY status
                """,
                (ano, mes),
            )
            mes_atual = cursor.fetchall()

            cursor.execute(
                """
                SELECT status, COUNT(*) AS total
                FROM tb_solicitacao
                WHERE YEAR(data_solicitacao) = %s
                GROUP BY status
                """,
                (ano,),
            )
            ano_atual = cursor.fetchall()

            cursor.execute(
                """
                SELECT
                    MONTH(data_solicitacao) AS mes,
                    SUM(CASE WHEN status = 'ACEITO' THEN 1 ELSE 0 END) AS aceitas,
                    SUM(CASE WHEN status = 'EM ANALISE' THEN 1 ELSE 0 END) AS em_analise,
                    SUM(CASE WHEN status = 'NEGADO' THEN 1 ELSE 0 END) AS negadas
                FROM tb_solicitacao
                WHERE YEAR(data_solicitacao) = %s
                GROUP BY MONTH(data_solicitacao)
                ORDER BY MONTH(data_solicitacao)
                """,
                (ano,),
            )
            meses_db = cursor.fetchall()

            cursor.execute(
                """
                SELECT l.nome_loja, COUNT(s.id_solicitacao) AS total
                FROM tb_solicitacao AS s
                INNER JOIN tb_cartao AS ca
                    ON ca.id_produto = s.id_produto
                INNER JOIN tb_loja AS l
                    ON l.id_loja = ca.id_loja
                WHERE YEAR(s.data_solicitacao) = %s
                  AND MONTH(s.data_solicitacao) = %s
                GROUP BY l.id_loja, l.nome_loja
                ORDER BY total DESC, l.nome_loja ASC
                LIMIT 3
                """,
                (ano, mes),
            )
            top_lojas = cursor.fetchall()

            cursor.execute(
                """
                SELECT
                    CASE
                        WHEN ca.nome_cartao LIKE '%Loja DM%' THEN 'Cartão Loja DM'
                        WHEN ca.nome_cartao LIKE '%Cartao DM%' THEN 'Cartão DM'
                        WHEN ca.tipo_cartao = 'LOJA' THEN 'Cartão de loja'
                        ELSE 'Outros cartões'
                    END AS categoria,
                    COUNT(s.id_solicitacao) AS total
                FROM tb_solicitacao AS s
                INNER JOIN tb_cartao AS ca
                    ON ca.id_produto = s.id_produto
                GROUP BY categoria
                ORDER BY total DESC, categoria ASC
                """
            )
            por_categoria = cursor.fetchall()

        status_padrao = ("ACEITO", "EM ANALISE", "NEGADO")
        mes_map = {item["status"]: int(item["total"]) for item in mes_atual}
        ano_map = {item["status"]: int(item["total"]) for item in ano_atual}
        mes_total = sum(mes_map.values())

        meses_map = {int(item["mes"]): item for item in meses_db}
        nomes_meses = (
            "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
            "Jul", "Ago", "Set", "Out", "Nov", "Dez",
        )
        por_mes = []
        for numero in range(1, 13):
            item = meses_map.get(numero, {})
            por_mes.append({
                "mes": numero,
                "nome_mes": nomes_meses[numero - 1],
                "aceitas": int(item.get("aceitas") or 0),
                "em_analise": int(item.get("em_analise") or 0),
                "negadas": int(item.get("negadas") or 0),
            })

        return {
            "ano": ano,
            "mes": mes,
            "indicadores": {
                "total_mes": mes_total,
                "aceitas_mes": mes_map.get("ACEITO", 0),
                "negadas_mes": mes_map.get("NEGADO", 0),
            },
            "mes_atual": [
                {"status": status, "total": mes_map.get(status, 0)}
                for status in status_padrao
            ],
            "ano_atual": [
                {"status": status, "total": ano_map.get(status, 0)}
                for status in status_padrao
            ],
            "por_mes": por_mes,
            "top_lojas": [
                {"nome_loja": item["nome_loja"], "total": int(item["total"])}
                for item in top_lojas
            ],
            "por_categoria": [
                {"categoria": item["categoria"], "total": int(item["total"])}
                for item in por_categoria
            ],
        }
    finally:
        conexao.close()
