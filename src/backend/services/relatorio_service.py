
from collections import Counter
from datetime import date, datetime
from io import BytesIO

from db import get_connection


STATUS_VALIDOS = ("EM ANALISE", "ACEITO", "NEGADO")


def buscar_dados_relatorio(data_inicio=None, data_fim=None):
    conexao = get_connection()

    try:
        with conexao.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    s.id_solicitacao,
                    s.status,
                    historico.data_referencia
                FROM tb_solicitacao AS s
                LEFT JOIN (
                    SELECT
                        id_solicitacao,
                        MIN(data_atendimento) AS data_referencia
                    FROM tb_atendimento
                    GROUP BY id_solicitacao
                ) AS historico
                    ON historico.id_solicitacao = s.id_solicitacao
                WHERE
                    (%s IS NULL OR historico.data_referencia >= %s)
                    AND (
                        %s IS NULL
                        OR historico.data_referencia < DATE_ADD(
                            %s, INTERVAL 1 DAY
                        )
                    )
                ORDER BY
                    historico.data_referencia DESC,
                    s.id_solicitacao DESC
                """,
                (
                    data_inicio,
                    data_inicio,
                    data_fim,
                    data_fim,
                ),
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
        data_referencia = registro["data_referencia"]

        if data_referencia:
            mes = data_referencia.strftime("%Y-%m")
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

    resumo.append(["Relatório de solicitações"])
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
        "Data do primeiro atendimento",
    ])

    for registro in relatorio["registros"]:
        detalhes.append([
            registro["id_solicitacao"],
            registro["status"],
            registro["data_referencia"],
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
            "DM Financeira | Relatório de solicitações",
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
        "Data do primeiro atendimento",
    ]]

    for registro in relatorio["registros"]:
        data_ref = registro["data_referencia"]

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

    conexao = get_connection()

    try:
        with conexao.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    s.id_solicitacao,
                    s.status,
                    s.id_atendente_responsavel,
                    s.data_conclusao,
                    historico.primeiro_atendimento,
                    historico.ultimo_atendimento
                FROM tb_solicitacao AS s
                INNER JOIN (
                    SELECT
                        id_solicitacao,
                        MIN(data_atendimento) AS primeiro_atendimento,
                        MAX(data_atendimento) AS ultimo_atendimento
                    FROM tb_atendimento
                    GROUP BY id_solicitacao
                ) AS historico
                    ON historico.id_solicitacao = s.id_solicitacao
                WHERE
                    (%s IS NULL OR historico.primeiro_atendimento >= %s)
                    AND (
                        %s IS NULL
                        OR historico.primeiro_atendimento < DATE_ADD(
                            %s, INTERVAL 1 DAY
                        )
                    )
                ORDER BY
                    historico.primeiro_atendimento DESC,
                    s.id_solicitacao DESC
                """,
                (
                    data_inicio,
                    data_inicio,
                    data_fim,
                    data_fim,
                ),
            )

            registros = cursor.fetchall()

        por_status = Counter(
            registro["status"] for registro in registros
        )

        concluidas = [
            registro
            for registro in registros
            if registro["status"] in ("ACEITO", "NEGADO")
        ]

        tempos_conclusao = []

        for registro in concluidas:
            inicio = registro["primeiro_atendimento"]
            fim = registro["data_conclusao"]

            # Só calcula quando o histórico contém a decisão
            # e ela ocorreu no mesmo instante ou após o início.
            if inicio and fim and fim >= inicio:
                segundos = (fim - inicio).total_seconds()
                tempos_conclusao.append(segundos)

        media_segundos = (
            sum(tempos_conclusao) / len(tempos_conclusao)
            if tempos_conclusao
            else None
        )

        por_mes = Counter()

        for registro in registros:
            data_referencia = registro["primeiro_atendimento"]

            if data_referencia:
                por_mes[data_referencia.strftime("%Y-%m")] += 1

        return {
            "total": len(registros),
            "concluidas": len(concluidas),
            "pendentes": por_status.get("EM ANALISE", 0),
            "aceitas": por_status.get("ACEITO", 0),
            "negadas": por_status.get("NEGADO", 0),
            "tempo_medio_segundos": media_segundos,
            "quantidade_com_tempo_calculado": len(
                tempos_conclusao
            ),
            "por_mes": [
                {"mes": mes, "total": por_mes[mes]}
                for mes in sorted(por_mes)
            ],
            "registros": registros,
        }

    finally:
        conexao.close()



def montar_relatorio_produtos(data_inicio=None, data_fim=None):
    """Gera o ranking de produtos por quantidade de solicitações."""

    conexao = get_connection()

    try:
        with conexao.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    p.id_produto,
                    COALESCE(
                        ca.nome_cartao,
                        se.nome_servico,
                        'Produto não identificado'
                    ) AS nome_produto,
                    CASE
                        WHEN ca.id_produto IS NOT NULL THEN 'CARTAO'
                        WHEN se.id_produto IS NOT NULL THEN 'SERVICO'
                        ELSE 'PRODUTO'
                    END AS tipo_produto,
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
                FROM tb_produto AS p
                LEFT JOIN tb_cartao AS ca
                    ON ca.id_produto = p.id_produto
                LEFT JOIN tb_servico AS se
                    ON se.id_produto = p.id_produto
                LEFT JOIN tb_solicitacao AS s
                    ON s.id_produto = p.id_produto
                LEFT JOIN (
                    SELECT
                        id_solicitacao,
                        MIN(data_atendimento) AS primeira_data
                    FROM tb_atendimento
                    GROUP BY id_solicitacao
                ) AS datas
                    ON datas.id_solicitacao = s.id_solicitacao
                WHERE
                    (
                        %s IS NULL
                        OR datas.primeira_data >= %s
                    )
                    AND (
                        %s IS NULL
                        OR datas.primeira_data < DATE_ADD(
                            %s, INTERVAL 1 DAY
                        )
                    )
                GROUP BY
                    p.id_produto,
                    ca.nome_cartao,
                    se.nome_servico,
                    ca.id_produto,
                    se.id_produto
                ORDER BY total DESC, nome_produto ASC
                """,
                (
                    data_inicio,
                    data_inicio,
                    data_fim,
                    data_fim,
                ),
            )

            produtos = cursor.fetchall()

        return {
            "total": sum(item["total"] for item in produtos),
            "produtos": produtos,
        }

    finally:
        conexao.close()
