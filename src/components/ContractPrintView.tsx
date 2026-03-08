import { forwardRef } from "react";

interface ContractPrintViewProps {
  nome: string;
  conteudo: string;
  clausulas: { titulo: string; conteudo: string }[];
}

const ContractPrintView = forwardRef<HTMLDivElement, ContractPrintViewProps>(
  ({ nome, conteudo, clausulas }, ref) => {
    return (
      <div ref={ref} className="print-contract hidden print:block">
        <style>{`
          @media print {
            body * { visibility: hidden; }
            .print-contract, .print-contract * { visibility: visible; }
            .print-contract {
              position: absolute;
              left: 0;
              top: 0;
              width: 210mm;
              padding: 20mm 25mm;
              font-family: 'Times New Roman', serif;
              font-size: 12pt;
              line-height: 1.6;
              color: #000;
            }
            .print-contract h1 { font-size: 16pt; text-align: center; margin-bottom: 24pt; font-weight: bold; text-transform: uppercase; }
            .print-contract h2 { font-size: 13pt; font-weight: bold; margin-top: 18pt; margin-bottom: 6pt; }
            .print-contract p { text-align: justify; margin-bottom: 6pt; }
            @page { size: A4; margin: 20mm 25mm; }
          }
        `}</style>
        <h1>{nome}</h1>
        <div dangerouslySetInnerHTML={{ __html: conteudo }} />
        {clausulas.length > 0 && (
          <>
            <h2 style={{ marginTop: "24pt" }}>CLÁUSULAS</h2>
            {clausulas.map((c, i) => (
              <div key={i} style={{ marginBottom: "12pt" }}>
                <h2>{`CLÁUSULA ${i + 1}ª — ${c.titulo.toUpperCase()}`}</h2>
                <div dangerouslySetInnerHTML={{ __html: c.conteudo }} />
              </div>
            ))}
          </>
        )}
      </div>
    );
  }
);

ContractPrintView.displayName = "ContractPrintView";
export default ContractPrintView;
