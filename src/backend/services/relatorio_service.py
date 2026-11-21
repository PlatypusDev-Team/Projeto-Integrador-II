from collections import Counter, defaultdict
from datetime import date, datetime
from io import BytesIO

from db import get_connection


STATUS_VALIDOS = ("EM ANALISE", "ACEITO", "NEGADO")


def _filtro_periodo_sql(data_inicio=None, data_fim=None):
    """
    Retorna os parâmetros para filtrar data_solicitacao.
    O limite final é exclusivo para incluir todo o último dia.
    """
    return (
        data_inicio,
        data_inicio,
        data_fim,
        data_fim,
    )


def buscar_dados_relatorio(data_inicio=None, data_fim=None):
    """
    Busca somente solicitações de cartões.
    A data usada para filtrar e agrupar é data_solicitacao.
    """
    conexao = get_connection()

    try:
        with conexao.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    s.id_solicitacao,
                    s.status,
                    s.data_solicitacao
                FROM tb_solicitacao AS s
                INNER JOIN tb_cartao AS ca
                    ON ca.id_produto = s.id_produto
                WHERE
                    s.status IN ('EM ANALISE', 'ACEITO', 'NEGADO')
                    AND (
                        %s IS NULL
                        OR s.data_solicitacao >= %s
                    )
                    AND (
                        %s IS NULL
                        OR s.data_solicitacao < DATE_ADD(
                            %s, INTERVAL 1 DAY
                        )
                    )
                ORDER BY
                    s.data_solicitacao DESC,
                    s.id_solicitacao DESC
                """,
                _filtro_periodo_sql(data_inicio, data_fim),
            )

            return cursor.fetchall()

    finally:
        conexao.close()


def montar_relatorio(data_inicio=None, data_fim=None):
    registros = buscar_dados_relatorio(data_inicio, data_fim)

    contagem = Counter(
        registro["status"] for registro in registros
    )

    por_status = [
        {
            "status": status,
            "total": contagem.get(status, 0),
        }
        for status in STATUS_VALIDOS
    ]

    por_mes = Counter()

    for registro in registros:
        data_solicitacao = registro["data_solicitacao"]

        if data_solicitacao:
            mes = data_solicitacao.strftime("%Y-%m")
            por_mes[mes] += 1

    return {
        "total": len(registros),
        "por_status": por_status,
        "por_mes": [
            {"mes": mes, "total": por_mes[mes]}
            for mes in sorted(por_mes)
        ],
        "registros": registros,
    }


def gerar_excel_relatorio(relatorio):
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment
    from openpyxl.utils import get_column_letter

    workbook = Workbook()

    cor_principal = "212ACF"
    preenchimento_cabecalho = PatternFill(
        fill_type="solid",
        fgColor=cor_principal,
    )
    fonte_cabecalho = Font(
        bold=True,
        color="FFFFFF",
    )

    resumo = workbook.active
    resumo.title = "Resumo"

    resumo.append(["Relatório de solicitações de cartões"])
    resumo.append(["Total de solicitações", relatorio["total"]])
    resumo.append([])
    resumo.append(["Status", "Quantidade"])

    for item in relatorio["por_status"]:
        resumo.append([item["status"], item["total"]])

    resumo["A1"].font = Font(
        bold=True,
        size=16,
        color=cor_principal,
    )
    resumo["A2"].font = Font(bold=True)

    for celula in resumo[4]:
        celula.font = fonte_cabecalho
        celula.fill = preenchimento_cabecalho
        celula.alignment = Alignment(horizontal="center")

    resumo.freeze_panes = "A5"
    resumo.auto_filter.ref = f"A4:B{resumo.max_row}"

    detalhes = workbook.create_sheet("Solicitações")

    detalhes.append([
        "ID da solicitação",
        "Status",
        "Data da solicitação",
    ])

    for registro in relatorio["registros"]:
        detalhes.append([
            registro["id_solicitacao"],
            registro["status"],
            registro["data_solicitacao"],
        ])

    for celula in detalhes[1]:
        celula.font = fonte_cabecalho
        celula.fill = preenchimento_cabecalho
        celula.alignment = Alignment(
            horizontal="center",
            vertical="center",
            wrap_text=True,
        )

    detalhes.freeze_panes = "A2"
    detalhes.auto_filter.ref = f"A1:C{detalhes.max_row}"
    detalhes.row_dimensions[1].height = 32

    for linha in detalhes.iter_rows(min_row=2):
        linha[0].alignment = Alignment(horizontal="center")
        linha[1].alignment = Alignment(horizontal="center")

        if isinstance(linha[2].value, (datetime, date)):
            linha[2].number_format = "dd/mm/yyyy hh:mm"
            linha[2].alignment = Alignment(horizontal="center")
        else:
            linha[2].value = "Sem registro de data"

    for planilha in workbook.worksheets:
        for coluna in planilha.columns:
            largura = max(
                len(str(celula.value or ""))
                for celula in coluna
            )
            letra = get_column_letter(coluna[0].column)

            planilha.column_dimensions[letra].width = min(
                max(largura + 3, 12),
                45,
            )

    arquivo = BytesIO()
    workbook.save(arquivo)
    arquivo.seek(0)

    return arquivo


def gerar_pdf_relatorio(relatorio):
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_LEFT
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import (
        getSampleStyleSheet,
        ParagraphStyle,
    )
    from reportlab.lib.units import cm
    from reportlab.platypus import (
        SimpleDocTemplate,
        Paragraph,
        Spacer,
        Table,
        TableStyle,
    )

    arquivo = BytesIO()

    documento = SimpleDocTemplate(
        arquivo,
        pagesize=landscape(A4),
        rightMargin=1.5 * cm,
        leftMargin=1.5 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm,
    )

    estilos = getSampleStyleSheet()
    estilos.add(
        ParagraphStyle(
            name="DMTitle",
            parent=estilos["Title"],
            textColor=colors.HexColor("#212ACF"),
            alignment=TA_LEFT,
        )
    )

    conteudo = [
        Paragraph(
            "DM Financeira | Relatório de solicitações de cartões",
            estilos["DMTitle"],
        ),
        Spacer(1, 0.4 * cm),
        Paragraph(
            f"Total de solicitações no período: {relatorio['total']}",
            estilos["Normal"],
        ),
        Spacer(1, 0.4 * cm),
        Paragraph("Resumo por status", estilos["Heading2"]),
    ]

    dados_resumo = [["Status", "Quantidade"]]

    for item in relatorio["por_status"]:
        dados_resumo.append([item["status"], item["total"]])

    tabela_resumo = Table(dados_resumo, repeatRows=1)
    tabela_resumo.setStyle(TableStyle([
        (
            "BACKGROUND",
            (0, 0),
            (-1, 0),
            colors.HexColor("#212ACF"),
        ),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        (
            "GRID",
            (0, 0),
            (-1, -1),
            0.4,
            colors.HexColor("#DDE0EB"),
        ),
        ("PADDING", (0, 0), (-1, -1), 7),
    ]))

    conteudo.extend([
        tabela_resumo,
        Spacer(1, 0.5 * cm),
        Paragraph(
            "Detalhamento das solicitações",
            estilos["Heading2"],
        ),
    ])

    dados_detalhes = [[
        "Solicitação",
        "Status",
        "Data da solicitação",
    ]]

    for registro in relatorio["registros"]:
        data_ref = registro["data_solicitacao"]

        if isinstance(data_ref, (datetime, date)):
            data_formatada = data_ref.strftime("%d/%m/%Y %H:%M")
        else:
            data_formatada = "Sem registro de data"

        dados_detalhes.append([
            str(registro["id_solicitacao"]),
            registro["status"],
            data_formatada,
        ])

    tabela_detalhes = Table(
        dados_detalhes,
        repeatRows=1,
        colWidths=[4 * cm, 6 * cm, 8 * cm],
    )

    tabela_detalhes.setStyle(TableStyle([
        (
            "BACKGROUND",
            (0, 0),
            (-1, 0),
            colors.HexColor("#212ACF"),
        ),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        (
            "GRID",
            (0, 0),
            (-1, -1),
            0.4,
            colors.HexColor("#DDE0EB"),
        ),
        ("PADDING", (0, 0), (-1, -1), 6),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))

    conteudo.append(tabela_detalhes)
    documento.build(conteudo)

    arquivo.seek(0)
    return arquivo


def montar_relatorio_desempenho(
    data_inicio=None,
    data_fim=None,
):
    """
    Relatório de tempo de análise das solicitações de cartões.
    O tempo concluído é calculado entre data_solicitacao e data_conclusao.
    Solicitações em análise recebem métricas próprias de envelhecimento.
    """
    conexao = get_connection()

    try:
        with conexao.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    s.id_solicitacao,
                    s.status,
                    s.data_solicitacao,
                    s.data_conclusao,
                    CASE
                        WHEN s.data_conclusao IS NOT NULL
                        THEN TIMESTAMPDIFF(
                            SECOND,
                            s.data_solicitacao,
                            s.data_conclusao
                        )
                        ELSE NULL
                    END AS tempo_analise_segundos,
                    CASE
                        WHEN s.status = 'EM ANALISE'
                        THEN TIMESTAMPDIFF(
                            SECOND,
                            s.data_solicitacao,
                            CURRENT_TIMESTAMP()
                        )
                        ELSE NULL
                    END AS tempo_pendente_segundos
                FROM tb_solicitacao AS s
                INNER JOIN tb_cartao AS ca
                    ON ca.id_produto = s.id_produto
                WHERE
                    s.status IN ('EM ANALISE', 'ACEITO', 'NEGADO')
                    AND (
                        %s IS NULL
                        OR s.data_solicitacao >= %s
                    )
                    AND (
                        %s IS NULL
                        OR s.data_solicitacao < DATE_ADD(
                            %s, INTERVAL 1 DAY
                        )
                    )
                ORDER BY
                    s.data_solicitacao DESC,
                    s.id_solicitacao DESC
                """,
                _filtro_periodo_sql(data_inicio, data_fim),
            )

            registros = cursor.fetchall()

        por_status = Counter(
            registro["status"] for registro in registros
        )

        tempos_conclusao = [
            registro["tempo_analise_segundos"]
            for registro in registros
            if registro["status"] in ("ACEITO", "NEGADO")
            and registro["tempo_analise_segundos"] is not None
            and registro["tempo_analise_segundos"] >= 0
        ]

        tempos_pendentes = [
            registro["tempo_pendente_segundos"]
            for registro in registros
            if registro["status"] == "EM ANALISE"
            and registro["tempo_pendente_segundos"] is not None
            and registro["tempo_pendente_segundos"] >= 0
        ]

        media_conclusao = (
            sum(tempos_conclusao) / len(tempos_conclusao)
            if tempos_conclusao
            else None
        )

        media_pendencia = (
            sum(tempos_pendentes) / len(tempos_pendentes)
            if tempos_pendentes
            else None
        )

        maior_pendencia = (
            max(tempos_pendentes)
            if tempos_pendentes
            else None
        )

        por_mes = defaultdict(lambda: {
            "total": 0,
            "concluidas": 0,
            "tempo_total_segundos": 0,
            "quantidade_tempos": 0,
        })

        for registro in registros:
            data_solicitacao = registro["data_solicitacao"]

            if not data_solicitacao:
                continue

            mes = data_solicitacao.strftime("%Y-%m")
            item = por_mes[mes]
            item["total"] += 1

            tempo = registro["tempo_analise_segundos"]

            if (
                registro["status"] in ("ACEITO", "NEGADO")
                and tempo is not None
                and tempo >= 0
            ):
                item["concluidas"] += 1
                item["tempo_total_segundos"] += tempo
                item["quantidade_tempos"] += 1

        resumo_mensal = []

        for mes in sorted(por_mes):
            item = por_mes[mes]
            media_mes = (
                item["tempo_total_segundos"] / item["quantidade_tempos"]
                if item["quantidade_tempos"]
                else None
            )

            resumo_mensal.append({
                "mes": mes,
                "total": item["total"],
                "concluidas": item["concluidas"],
                "tempo_medio_segundos": media_mes,
            })

        return {
            "total": len(registros),
            "concluidas": por_status.get("ACEITO", 0)
                + por_status.get("NEGADO", 0),
            "pendentes": por_status.get("EM ANALISE", 0),
            "aceitas": por_status.get("ACEITO", 0),
            "negadas": por_status.get("NEGADO", 0),
            "tempo_medio_segundos": media_conclusao,
            "quantidade_com_tempo_calculado": len(tempos_conclusao),
            "tempo_medio_pendente_segundos": media_pendencia,
            "maior_tempo_pendente_segundos": maior_pendencia,
            "por_mes": resumo_mensal,
            "registros": registros,
        }

    finally:
        conexao.close()


def montar_relatorio_produtos(data_inicio=None, data_fim=None):
    """
    Relatório de produtividade por loja.
    Apesar do nome legado da função, retorna somente solicitações de cartões.
    """
    conexao = get_connection()

    try:
        with conexao.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    l.id_loja,
                    l.nome_loja,
                    COUNT(s.id_solicitacao) AS total,
                    SUM(
                        CASE
                            WHEN s.status = 'EM ANALISE' THEN 1
                            ELSE 0
                        END
                    ) AS em_analise,
                    SUM(
                        CASE
                            WHEN s.status = 'ACEITO' THEN 1
                            ELSE 0
                        END
                    ) AS aceitas,
                    SUM(
                        CASE
                            WHEN s.status = 'NEGADO' THEN 1
                            ELSE 0
                        END
                    ) AS negadas
                FROM tb_solicitacao AS s
                INNER JOIN tb_cartao AS ca
                    ON ca.id_produto = s.id_produto
                INNER JOIN tb_loja AS l
                    ON l.id_loja = ca.id_loja
                WHERE
                    s.status IN ('EM ANALISE', 'ACEITO', 'NEGADO')
                    AND (
                        %s IS NULL
                        OR s.data_solicitacao >= %s
                    )
                    AND (
                        %s IS NULL
                        OR s.data_solicitacao < DATE_ADD(
                            %s, INTERVAL 1 DAY
                        )
                    )
                GROUP BY
                    l.id_loja,
                    l.nome_loja
                ORDER BY
                    total DESC,
                    l.nome_loja ASC
                """,
                _filtro_periodo_sql(data_inicio, data_fim),
            )

            lojas = cursor.fetchall()

        return {
            "total": sum(item["total"] for item in lojas),
            "lojas": lojas,
        }

    finally:
        conexao.close()


def montar_relatorio_tipos_cartao(data_inicio=None, data_fim=None):
    """
    Retorna o volume de solicitações por categoria de cartão e por mês.
    A regra de classificação é a mesma já utilizada no dashboard.
    """
    conexao = get_connection()

    try:
        with conexao.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    DATE_FORMAT(
                        s.data_solicitacao,
                        '%Y-%m'
                    ) AS mes,
                    CASE
                        WHEN ca.nome_cartao LIKE '%Loja DM%'
                            THEN 'Cartão Loja DM'
                        WHEN ca.nome_cartao LIKE '%Cartao DM%'
                            THEN 'Cartão DM'
                        WHEN ca.tipo_cartao = 'LOJA'
                            THEN 'Cartão de loja'
                        ELSE 'Outros cartões'
                    END AS tipo_cartao,
                    COUNT(s.id_solicitacao) AS total
                FROM tb_solicitacao AS s
                INNER JOIN tb_cartao AS ca
                    ON ca.id_produto = s.id_produto
                WHERE
                    s.status IN ('EM ANALISE', 'ACEITO', 'NEGADO')
                    AND (
                        %s IS NULL
                        OR s.data_solicitacao >= %s
                    )
                    AND (
                        %s IS NULL
                        OR s.data_solicitacao < DATE_ADD(
                            %s, INTERVAL 1 DAY
                        )
                    )
                GROUP BY
                    mes,
                    tipo_cartao
                ORDER BY
                    mes ASC,
                    tipo_cartao ASC
                """,
                _filtro_periodo_sql(data_inicio, data_fim),
            )

            registros = cursor.fetchall()

        totais_por_tipo = Counter()
        totais_por_mes = Counter()

        for registro in registros:
            totais_por_tipo[registro["tipo_cartao"]] += registro["total"]
            totais_por_mes[registro["mes"]] += registro["total"]

        return {
            "total": sum(totais_por_tipo.values()),
            "por_tipo": [
                {
                    "tipo_cartao": tipo,
                    "total": total,
                }
                for tipo, total in sorted(totais_por_tipo.items())
            ],
            "por_mes": [
                {
                    "mes": mes,
                    "total": total,
                }
                for mes, total in sorted(totais_por_mes.items())
            ],
            "por_mes_tipo": registros,
        }

    finally:
        conexao.close()
