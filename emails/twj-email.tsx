import { Body, Button, Container, Head, Hr, Html, Preview, Section, Text } from "@react-email/components";

// TODO(marca): colores definitivos (mismos que src/styles/tokens.css) y logo.
const navy = "#0b1f3a";
const blue = "#3a9ad9";

export type TwjEmailProps = {
  preview: string;
  /** Párrafos de texto plano (ya con variables sustituidas) */
  paragraphs: string[];
  cta?: { label: string; href: string };
  footer?: string;
};

/** Plantilla base de todos los emails transaccionales de TWJ. */
export default function TwjEmail({ preview, paragraphs, cta, footer }: TwjEmailProps) {
  return (
    <Html lang="es">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: "#f3f9fe", fontFamily: "Inter, Helvetica, Arial, sans-serif", margin: 0 }}>
        <Container style={{ maxWidth: 560, margin: "0 auto", padding: "32px 16px" }}>
          <Text style={{ color: navy, fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 16px" }}>
            TRAIN <span style={{ color: blue }}>WITH</span> JAIME
          </Text>
          <Section style={{ backgroundColor: "#ffffff", borderRadius: 16, padding: 24 }}>
            {paragraphs.map((p, i) => (
              <Text
                key={i}
                style={{ color: navy, fontSize: 15, lineHeight: "24px", margin: "0 0 12px", whiteSpace: "pre-line" }}
              >
                {p}
              </Text>
            ))}
            {cta ? (
              <Button
                href={cta.href}
                style={{
                  backgroundColor: navy,
                  color: "#ffffff",
                  borderRadius: 10,
                  padding: "12px 20px",
                  fontWeight: 600,
                  fontSize: 15,
                  marginTop: 8,
                }}
              >
                {cta.label}
              </Button>
            ) : null}
          </Section>
          <Hr style={{ borderColor: "#dde3ea", margin: "24px 0 12px" }} />
          <Text style={{ color: "#5b6878", fontSize: 12, lineHeight: "18px" }}>
            {footer ?? "¿Y tú, quieres ganar? · Train with Jaime · Este es un email de servicio de tu plan."}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

TwjEmail.PreviewProps = {
  preview: "Pago confirmado",
  paragraphs: ["Hola Pablo:", "Pago confirmado y plan All In activado.", "¿Y tú, quieres ganar?"],
  cta: { label: "Rellenar mi ficha", href: "https://app.trainwithjaime.es/onboarding" },
} satisfies TwjEmailProps;
