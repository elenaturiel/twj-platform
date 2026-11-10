import { NextResponse, type NextRequest } from "next/server";

// Enlaces de acceso (invitación, recuperación, confirmación). No se gasta el token aquí:
// WhatsApp, el correo y los antivirus abren el enlace para la vista previa y lo
// consumirían antes que la persona. Se pasa a una pantalla con botón que lo verifica.
export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/auth/acceso";
  return NextResponse.redirect(url);
}
